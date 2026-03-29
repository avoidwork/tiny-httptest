import http from "node:http";
import https from "node:https";
import {URL} from "node:url";
import {coerce} from "tiny-coerce";
import {headersContentType, maybeJsonHeader, notEmpty, quoted} from "./regex.js";
import {
	ACCESS_CONTROL_ALLOW_CREDENTIALS,
	ACCESS_CONTROL_ALLOW_HEADERS,
	ACCESS_CONTROL_ALLOW_ORIGIN,
	ACCESS_CONTROL_EXPOSE_HEADERS,
	ACCESS_CONTROL_REQUEST_HEADERS,
	APPLICATION_JSON,
	BASIC,
	CONTENT_LENGTH,
	CONTENT_TYPE,
	DELIMITER,
	EMPTY,
	GET,
	HEADER,
	HTTP,
	IF_NONE_MATCH,
	INVALID_HTTP_METHOD,
	LOCALHOST,
	OPTIONS,
	SET_COOKIE,
	STATUS,
	TRUE,
	TIMEOUT,
	USER_AGENT,
	USER_AGENT_VALUE,
	UTF8
} from "./constants.js";
import {captured, etags, jar} from "./shared.js";

const PROTOCOL_DELIMITER = `${HTTP}${DELIMITER}`;

/**
 * Validates HTTP method
 * @param {string} method - HTTP method to validate
 * @returns {string} Uppercase method
 * @throws {Error} If method is invalid
 */
function validateMethod(method) {
	const type = method.toUpperCase();
	if (!http.METHODS.includes(type)) {
		throw new Error(INVALID_HTTP_METHOD);
	}
	return type;
}

/**
 * Validates and formats request body
 * @param {string|Object|Array} body - Body to validate
 * @returns {string} Stringified body
 */
function formatBody(body) {
	if (typeof body === "string") {
		return quoted.test(body) ? body : JSON.stringify(body);
	}
	try {
		return JSON.stringify(body, null, 0);
	} catch {
		return EMPTY;
	}
}

/**
 * Builds request options with defaults
 * @param {URL} parsed - Parsed URL
 * @param {string} method - HTTP method
 * @param {Object} headers - Request headers
 * @param {string|Object|Array} body - Request body
 * @param {number} timeout - Request timeout
 * @returns {Object} Request options
 */
function buildOptions(parsed, method, headers, body, timeout) {
	const options = {
		hostname: parsed.hostname,
		method,
		path: `${parsed.pathname}${parsed.search}`,
		port: parsed.port,
		protocol: parsed.protocol,
		headers: {
			...headers,
			[USER_AGENT]: USER_AGENT_VALUE
		},
		timeout
	};

	if (parsed.username?.trim()) {
		options.auth = `${parsed.username}${DELIMITER}${parsed.password}`;
		options.headers.authorization = BASIC.replace("%A", Buffer.from(options.auth).toString("base64"));
	}

	if (body) {
		const formatted = formatBody(body);
		options.body = formatted;
		options.headers[CONTENT_LENGTH] = Buffer.byteLength(formatted);
	}

	return options;
}

/**
 * HTTPTest class for creating HTTP test requests
 * @class
 */
export class HTTPTest {
	/**
	 * Creates an HTTPTest instance
	 * @param {string} uri - The URL to request
	 * @param {string} method - The HTTP method
	 * @param {Object} headers - Request headers
	 * @param {string|Object|Array} body - Request body
	 * @param {number} timeout - Request timeout in milliseconds
	 */
	constructor(uri, method, headers, body, timeout) {
		const parsed = new URL(uri);

		this.#body = EMPTY;
		this.#capture = new Set();
		this.#etag = false;
		#expects.set(STATUS, 0);
		#expects.set(BODY, EMPTY);
		#expects.set(HEADERS, new Map());
		#expects.set(VALUES, new Map());
		this.options = buildOptions(parsed, validateMethod(method), headers, body, timeout);

		this.#jar = false;
		this.#reuse = new Set();
	}

	/**
	 * Captures a header to be reused by another instance
	 * @param {string} name - Header name to capture
	 * @returns {HTTPTest} Returns this instance for chaining
	 */
	captureHeader(name) {
		this.#capture.add(name);
		return this;
	}

	/**
	 * Enables or disables cookie capture & reuse
	 * @param {boolean} [state=true] - Whether to enable cookie jar
	 * @returns {HTTPTest} Returns this instance for chaining
	 */
	cookies(state = true) {
		this.#jar = state;
		return this;
	}

	/**
	 * Sets CORS request & response header expectations
	 * @param {string} [hostname] - Origin hostname (defaults to request hostname)
	 * @param {boolean} [success=true] - Whether to expect CORS headers
	 * @returns {HTTPTest} Returns this instance for chaining
	 */
	cors(arg, success = true) {
		const origin = arg || this.options.hostname;

		this.options.headers.origin = origin;
		this.options.headers[ACCESS_CONTROL_REQUEST_HEADERS] = CONTENT_TYPE;

		if (success) {
			this.expectHeader(ACCESS_CONTROL_ALLOW_ORIGIN, origin);
			this.expectHeader(ACCESS_CONTROL_ALLOW_CREDENTIALS, TRUE);
			this.expectHeader(
				this.options.method === OPTIONS ? ACCESS_CONTROL_ALLOW_HEADERS : ACCESS_CONTROL_EXPOSE_HEADERS,
				headersContentType
			);
		}

		return this;
	}

	/**
	 * Ends the request, Promise resolves with HTTPTest instance or rejects with Error
	 * @returns {Promise<HTTPTest>} Promise resolving to this instance
	 */
	async end() {
		await this.#applyReuse();
		const response = await this.#request();

		this.#body = response.body;
		this.#headers = response.headers;
		this.#status = response.statusCode;

		this.#processExpectations();
		this.#captureState();

		return this;
	}

	/**
	 * Enables or disables ETag capture & reuse
	 * @param {boolean} [state=true] - Whether to enable ETag handling
	 * @returns {HTTPTest} Returns this instance for chaining
	 */
	etags(state = true) {
		this.#etag = state;
		return this;
	}

	/**
	 * Sets an expectation of the response body
	 * @param {RegExp|Function|string} [value=/\w+/] - Expected body value or test
	 * @returns {HTTPTest} Returns this instance for chaining
	 */
	expectBody(value = notEmpty) {
		#expects.set(BODY, value);
		return this;
	}

	/**
	 * Sets an expectation of a response header
	 * @param {string} name - Header name
	 * @param {RegExp|Function|string} [value=/\w+/] - Expected header value or test
	 * @returns {HTTPTest} Returns this instance for chaining
	 */
	expectHeader(name, value = notEmpty) {
		#expects.get(HEADERS).set(name.toLowerCase(), value);
		return this;
	}

	/**
	 * Sets an expectation of response header content-type as JSON
	 * @returns {HTTPTest} Returns this instance for chaining
	 */
	expectJson() {
		this.options.headers.accept = APPLICATION_JSON;
		return this.expectHeader(CONTENT_TYPE, maybeJsonHeader);
	}

	/**
	 * Sets an expectation of response status code
	 * @param {number} [value=200] - Expected status code
	 * @returns {HTTPTest} Returns this instance for chaining
	 */
	expectStatus(value = 200) {
		#expects.set(STATUS, value);
		return this;
	}

	/**
	 * Sets an expectation of a JSON value in the response body
	 * @param {string} name - JSON key name
	 * @param {*} value - Expected value
	 * @returns {HTTPTest} Returns this instance for chaining
	 */
	expectValue(name, value) {
		this.expectJson();
		#expects.get(VALUES).set(name, value);
		return this;
	}

	/**
	 * Sets request & response to JSON, sends arg if provided
	 * @param {*} [arg] - JSON body to send
	 * @returns {HTTPTest} Returns this instance for chaining
	 */
	json(arg = undefined) {
		this.options.headers[CONTENT_TYPE] = APPLICATION_JSON;
		if (arg !== undefined) {
			this.send(arg);
		}
		return this.expectJson();
	}

	/**
	 * Marks a header for reuse from captured headers
	 * @param {string} name - Header name to reuse
	 * @returns {HTTPTest} Returns this instance for chaining
	 */
	reuseHeader(name) {
		this.#reuse.add(name);
		return this;
	}

	/**
	 * Decorates arg as request body & sets request headers
	 * @param {string|Object|Array} arg - Body to send
	 * @returns {HTTPTest} Returns this instance for chaining
	 */
	send(arg) {
		const body = formatBody(arg);
		this.options.body = body;
		this.options.headers[CONTENT_TYPE] ??= APPLICATION_JSON;
		this.options.headers[CONTENT_LENGTH] = Buffer.byteLength(body);
		return this;
	}

	#expects = new Map();
	#body = EMPTY;
	#headers = {};
	#status = 0;
	#capture = new Set();
	#etag = false;
	#jar = false;
	#reuse = new Set();

	#processExpectations() {
		if (this.#status >= 400) {
			for (const key of [ACCESS_CONTROL_ALLOW_ORIGIN, ACCESS_CONTROL_REQUEST_HEADERS, ACCESS_CONTROL_ALLOW_HEADERS, ACCESS_CONTROL_ALLOW_CREDENTIALS, ACCESS_CONTROL_EXPOSE_HEADERS]) {
				#expects.get(HEADERS).delete(key);
			}
		}

		this.#validate(STATUS, #expects.get(STATUS), this.#status);
		this.#validateHeaders();
		this.#validateBody();
		this.#validateValues();
	}

	#validateHeaders() {
		for (const [name, expected] of #expects.get(HEADERS)) {
			this.#validate(`${HEADER} "${name}"`, expected, coerce(this.#headers[name]));
		}
	}

	#validateBody() {
		const expected = #expects.get(BODY);
		if (expected && maybeJsonHeader.test(this.#headers[CONTENT_TYPE] || EMPTY)) {
			try {
				this.#body = JSON.parse(this.#body);
			} catch {
				// Keep as string if not valid JSON
			}
		}
		if (expected) {
			this.#validate(BODY, expected, this.#body);
		}
	}

	#validateValues() {
		for (const [name, expected] of #expects.get(VALUES)) {
			this.#validate(BODY, expected, this.#body[name]);
		}
	}

	#validate(type, expected, actual) {
		if (!expected || expected === EMPTY) return;

		const valid = this.#test(expected, actual);
		if (!valid) {
			throw new Error(this.#formatError(type, expected, actual));
		}
	}

	#test(expected, actual) {
		if (expected instanceof Function) {
			try {
				return expected(actual) === true;
			} catch {
				return false;
			}
		}
		if (expected instanceof RegExp) {
			return expected.test(actual);
		}
		if (typeof expected === "object" && typeof actual === "object") {
			return JSON.stringify(expected, null, 0) === JSON.stringify(actual, null, 0);
		}
		if (typeof expected === "number" && typeof actual === "number") {
			return Number(expected) === Number(actual);
		}
		return expected === actual;
	}

	#formatError(type, expected, actual) {
		const exp = expected instanceof RegExp ? expected.toString() : JSON.stringify(expected);
		const act = actual === undefined ? "undefined" : JSON.stringify(actual);
		return `Expected ${type} to be ${exp}, got ${act}`;
	}

	#captureState() {
		for (const name of this.#capture) {
			if (this.#headers[name] !== undefined) {
				captured.set(name, this.#headers[name]);
			}
		}

		if (this.#jar && this.#headers[SET_COOKIE]) {
			jar.set(`${this.options.hostname}${DELIMITER}${this.options.port}`, this.#headers[SET_COOKIE]);
		}

		if (this.#etag && this.#headers.etag) {
			etags.set(`${this.options.hostname}${DELIMITER}${this.options.port}${this.options.path}`, this.#headers.etag);
		}
	}

	async #applyReuse() {
		const key = `${this.options.hostname}${DELIMITER}${this.options.port}`;

		if (this.#jar) {
			const cookie = jar.get(key);
			if (cookie) {
				this.options.headers.cookie = cookie;
			}
		}

		if (this.#etag) {
			const etag = etags.get(`${key}${this.options.path}`);
			if (etag) {
				this.options.headers[IF_NONE_MATCH] = etag;
			}
		}

		for (const name of this.#reuse) {
			if (captured.has(name)) {
				this.options.headers[name] = captured.get(name);
			}
		}
	}

	#request() {
		return new Promise((resolve, reject) => {
			const client = this.options.protocol === PROTOCOL_DELIMITER ? http : https;
			const req = client.request(this.options, res => {
				res.setEncoding(UTF8);
				let body = EMPTY;

				res.on("data", chunk => {
					body += chunk;
				});

				res.on("end", () => {
					resolve({
						headers: res.headers,
						statusCode: res.statusCode,
						body
					});
				});
			});

			req.on("error", reject);

			if (this.options.body) {
				req.write(this.options.body);
			}
			req.end();
		});
	}
}

/**
 * Creates an HTTP test request
 * @function httptest
 * @param {Object} [options] - Test options
 * @param {string} [options.url=http://localhost] - URL to request
 * @param {string} [options.method=GET] - HTTP method
 * @param {string|Object|Array} [options.body=null] - Request body
 * @param {Object} [options.headers={}] - Request headers
 * @param {number} [options.timeout=30000] - Request timeout in milliseconds
 * @returns {HTTPTest} New HTTPTest instance
 * @throws {Error} Throws error if method is not valid or URL is unsafe
 */
export function httptest({url = LOCALHOST, method = GET, body = null, headers = {}, timeout = TIMEOUT} = {}) {
	return new HTTPTest(url, validateMethod(method), headers, body, timeout);
}
