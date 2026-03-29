import http from "node:http";
import https from "node:https";
import {URL} from "node:url";
import {
	ACCESS_CONTROL_ALLOW_CREDENTIALS,
	ACCESS_CONTROL_ALLOW_HEADERS,
	ACCESS_CONTROL_ALLOW_ORIGIN,
	ACCESS_CONTROL_EXPOSE_HEADERS,
	ACCESS_CONTROL_REQUEST_HEADERS,
	APPLICATION_JSON,
	CONTENT_TYPE,
	DELIMITER,
	EMPTY,
	GET,
	HTTP,
	LOCALHOST,
	OPTIONS,
	SET_COOKIE,
	STATUS,
	TIMEOUT,
	USER_AGENT,
	USER_AGENT_VALUE
} from "./constants.js";
import {
	applyReuse,
	buildOptions,
	captureState,
	formatBody,
	formatError,
	PROTOCOL_DELIMITER,
	removeCorsHeaders,
	test,
	validateBody,
	validateHeaders,
	validateMethod,
	validateValues
} from "./helpers.js";

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
		this.#expects = new Map();
		this.#expects.set(STATUS, 0);
		this.#expects.set(BODY, EMPTY);
		this.#expects.set(HEADERS, new Map());
		this.#expects.set(VALUES, new Map());
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
		this.options.headers = applyReuse(
			this.#jar,
			this.#etag,
			this.#reuse,
			this.options.hostname,
			this.options.port,
			this.options.path,
			this.options.headers
		);

		const response = await this.#request();

		this.#body = response.body;
		this.#headers = response.headers;
		this.#status = response.statusCode;

		this.#processExpectations();
		captureState(
			this.#capture,
			this.#headers,
			this.#jar,
			this.#etag,
			this.options.hostname,
			this.options.port,
			this.options.path
		);

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
		this.#expects.set(BODY, value);
		return this;
	}

	/**
	 * Sets an expectation of a response header
	 * @param {string} name - Header name
	 * @param {RegExp|Function|string} [value=/\w+/] - Expected header value or test
	 * @returns {HTTPTest} Returns this instance for chaining
	 */
	expectHeader(name, value = notEmpty) {
		this.#expects.get(HEADERS).set(name.toLowerCase(), value);
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
		this.#expects.set(STATUS, value);
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
		this.#expects.get(VALUES).set(name, value);
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

	#expects;
	#body = EMPTY;
	#headers = {};
	#status = 0;
	#capture = new Set();
	#etag = false;
	#jar = false;
	#reuse = new Set();

	#processExpectations() {
		if (this.#status >= 400) {
			removeCorsHeaders(this.#expects.get(HEADERS));
		}

		this.#validate(STATUS, this.#expects.get(STATUS), this.#status);
		validateHeaders(this.#expects.get(HEADERS), this.#headers, (type, exp, act) => this.#validate(type, exp, act));
		this.#body = validateBody(this.#expects.get(BODY), this.#body, this.#headers, (type, exp, act) => this.#validate(type, exp, act));
		validateValues(this.#expects.get(VALUES), this.#body, (type, exp, act) => this.#validate(type, exp, act));
	}

	#validate(type, expected, actual) {
		if (!expected || expected === EMPTY) return;

		if (!test(expected, actual)) {
			throw new Error(formatError(type, expected, actual));
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
 * @throws {Error} Throws error if method is not valid
 */
export function httptest({url = LOCALHOST, method = GET, body = null, headers = {}, timeout = TIMEOUT} = {}) {
	return new HTTPTest(url, validateMethod(method), headers, body, timeout);
}
