import http from "node:http";
import https from "node:https";
import {URL} from "node:url";
import {coerce} from "tiny-coerce";
import {headersContentType, maybeJsonHeader, notEmpty, quoted} from "./regex.js";
import {
	A,
	ACCESS_CONTROL_ALLOW_CREDENTIALS,
	ACCESS_CONTROL_ALLOW_HEADERS,
	ACCESS_CONTROL_ALLOW_ORIGIN,
	ACCESS_CONTROL_EXPOSE_HEADERS,
	ACCESS_CONTROL_REQUEST_HEADERS,
	APPLICATION_JSON,
	B,
	BASIC,
	BODY,
	CONTENT_LENGTH,
	CONTENT_TYPE,
	DATA,
	DELIMITER,
	EMPTY,
	END,
	ERROR,
	GET,
	HEADER,
	HEADERS,
	HTTP,
	IF_NONE_MATCH,
	INVALID_HTTP_METHOD,
	LOCALHOST,
	OBJECT,
	OPTIONS,
	SET_COOKIE,
	STATUS,
	STRING,
	TIMEOUT,
	TRUE,
	TYPE,
	UNEXPECTED_TYPE_A_B,
	USER_AGENT,
	USER_AGENT_VALUE,
	UTF8,
	VALUES
} from "./constants.js";
import {captured, etags, jar} from "./shared.js";

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
	constructor (uri, method, headers, body, timeout) {
		const parsed = new URL(uri);

		this.body = EMPTY;
		this.capture = new Set();
		this.etag = false;
		this.expects = new Map();
		this.expects.set(STATUS, 0);
		this.expects.set(BODY, EMPTY);
		this.expects.set(HEADERS, new Map());
		this.expects.set(VALUES, new Map());
		this.headers = {};
		this.options = {
			body: body,
			hostname: parsed.hostname,
			method: method,
			path: `${parsed.pathname}${parsed.search}`,
			port: parsed.port,
			protocol: parsed.protocol,
			headers: headers,
			timeout: timeout
		};

		this.options.headers[USER_AGENT] = USER_AGENT_VALUE;

		if (parsed.username.trim().length > 0) {
			this.options.auth = `${parsed.username}${DELIMITER}${parsed.password}`;
			this.options.headers.authorization = BASIC.replace(A, btoa(this.options.auth));
		}

		if (this.options.body) {
			this.send(this.options.body);
		}

		this.jar = false;
		this.req = null;
		this.res = null;
		this.reuse = new Set();
		this.status = 0;
	}

	/**
	 * Captures a header to be reused by another instance
	 * @param {string} name - Header name to capture
	 * @returns {HTTPTest} Returns this instance for chaining
	 */
	captureHeader (name) {
		if (!this.capture.has(name)) {
			this.capture.add(name);
		}

		return this;
	}

	/**
	 * Enables or disables cookie capture & reuse
	 * @param {boolean} [state=true] - Whether to enable cookie jar
	 * @returns {HTTPTest} Returns this instance for chaining
	 */
	cookies (state = true) {
		this.jar = state;

		return this;
	}

	/**
	 * Sets CORS request & response header expectations
	 * @param {string} [hostname] - Origin hostname (defaults to request hostname)
	 * @param {boolean} [success=true] - Whether to expect CORS headers
	 * @returns {HTTPTest} Returns this instance for chaining
	 */
	cors (arg, success = true) {
		const origin = arg || this.options.hostname;

		this.options.headers.origin = origin;
		this.options.headers[ACCESS_CONTROL_REQUEST_HEADERS] = CONTENT_TYPE;

		if (success) {
			this.expectHeader(ACCESS_CONTROL_ALLOW_ORIGIN, origin);
			this.expectHeader(ACCESS_CONTROL_ALLOW_CREDENTIALS, TRUE);

			if (this.options.method === OPTIONS) {
				this.expectHeader(ACCESS_CONTROL_ALLOW_HEADERS, headersContentType);
			} else {
				this.expectHeader(ACCESS_CONTROL_EXPOSE_HEADERS, headersContentType);
			}
		}

		return this;
	}

	/**
	 * Ends the request, Promise resolves with HTTPTest instance or rejects with Error
	 * @returns {Promise<HTTPTest>} Promise resolving to this instance
	 */
	end () {
		return new Promise((resolve, reject) => {
			const done = err => {
				if (err !== void 0) {
					reject(err);
				} else {
					try {
						this.process();
						resolve(this);
					} catch (e) {
						reject(e);
					}
				}
			};

			if (this.jar) {
				const cookie = jar.get(`${this.options.hostname}${DELIMITER}${this.options.port}`);

				if (cookie) {
					this.options.headers.cookie = cookie;
				}
			}

			if (this.etag) {
				const etag = etags.get(`${this.options.hostname}${DELIMITER}${this.options.port}${this.options.path}`);

				if (etag) {
					this.options.headers[IF_NONE_MATCH] = etag;
				}
			}

			if (this.reuse.size > 0) {
				this.reuse.forEach(k => {
					if (captured.has(k)) {
						this.options.headers[k] = captured.get(k);
					}
				});
			}

			this.request().then(() => done(), done);
		});
	}

	/**
	 * Enables or disables ETag capture & reuse
	 * @param {boolean} [state=true] - Whether to enable ETag handling
	 * @returns {HTTPTest} Returns this instance for chaining
	 */
	etags (state = true) {
		this.etag = state;

		return this;
	}

	/**
	 * Sets an expectation of the response body
	 * @param {RegExp|Function|string} [value=/\w+/] - Expected body value or test
	 * @returns {HTTPTest} Returns this instance for chaining
	 */
	expectBody (value = notEmpty) {
		this.expects.set(BODY, value);

		return this;
	}

	/**
	 * Sets an expectation of a response header
	 * @param {string} name - Header name
	 * @param {RegExp|Function|string} [value=/\w+/] - Expected header value or test
	 * @returns {HTTPTest} Returns this instance for chaining
	 */
	expectHeader (name, value = notEmpty) {
		this.expects.get(HEADERS).set(name.toLowerCase(), value);

		return this;
	}

	/**
	 * Sets an expectation of response header content-type as JSON
	 * @returns {HTTPTest} Returns this instance for chaining
	 */
	expectJson () {
		this.options.headers.accept = APPLICATION_JSON;

		return this.expectHeader(CONTENT_TYPE, maybeJsonHeader);
	}

	/**
	 * Sets an expectation of response status code
	 * @param {number} [value=200] - Expected status code
	 * @returns {HTTPTest} Returns this instance for chaining
	 */
	expectStatus (value = 200) {
		this.expects.set(STATUS, value);

		return this;
	}

	/**
	 * Sets an expectation of a JSON value in the response body
	 * @param {string} name - JSON key name
	 * @param {*} value - Expected value
	 * @returns {HTTPTest} Returns this instance for chaining
	 */
	expectValue (name, value) {
		this.expectJson();
		this.expects.get(VALUES).set(name, value);

		return this;
	}

	/**
	 * Sets request & response to JSON, sends arg if provided
	 * @param {*} [arg] - JSON body to send
	 * @returns {HTTPTest} Returns this instance for chaining
	 */
	json (arg = undefined) {
		this.options.headers[CONTENT_TYPE] = APPLICATION_JSON;

		if (arg !== undefined) {
			this.send(arg);
		}

		return this.expectJson();
	}

	/**
	 * Processes the response and validates expectations
	 * @returns {HTTPTest} Returns this instance for chaining
	 */
	process () {
		const body = this.expects.get(BODY),
			status = this.expects.get(STATUS);

		this.headers = this.res.headers;
		this.status = this.res.statusCode;

		if (status && this.status !== status) {
			this.test(this.status, status, this.warning(STATUS, this.status, status));
		}

		if (this.status >= 400) {
			this.expects.get(HEADERS).delete(ACCESS_CONTROL_ALLOW_ORIGIN);
			this.expects.get(HEADERS).delete(ACCESS_CONTROL_REQUEST_HEADERS);
			this.expects.get(HEADERS).delete(ACCESS_CONTROL_ALLOW_HEADERS);
			this.expects.get(HEADERS).delete(ACCESS_CONTROL_ALLOW_CREDENTIALS);
			this.expects.get(HEADERS).delete(ACCESS_CONTROL_EXPOSE_HEADERS);
		}

		this.expects.get(HEADERS).forEach((v, k) => this.test(v, this.headers[k], this.warning(`${HEADER} "${k}"`, v, coerce(this.headers[k]), k)));

		if (this.body && maybeJsonHeader.test(this.headers[CONTENT_TYPE] || EMPTY)) {
			try {
				this.body = JSON.parse(this.body);
			} catch (e) {
				void 0;
			}
		}

		if (body) {
			this.test(body, this.body, this.warning(BODY, this.body, body));
		}

		this.expects.get(VALUES).forEach((v, k) => this.test(v, this.body[k], this.warning(BODY, v, this.body[k])));

		if (this.capture.size > 0) {
			this.capture.forEach(k => {
				if (this.headers[k] !== undefined) {
					captured.set(k, this.headers[k]);
				}
			});
		}

		if (this.jar && this.headers[SET_COOKIE]) {
			jar.set(this.options.hostname + DELIMITER + this.options.port, this.headers[SET_COOKIE]);
		}

		if (this.etag && this.headers.etag) {
			etags.set(this.options.hostname + DELIMITER + this.options.port + this.options.path, this.headers.etag);
		}

		return this;
	}

	/**
	 * Makes the HTTP request
	 * @returns {Promise} Promise resolving when response completes
	 */
	request () {
		return new Promise((resolve, reject) => {
			this.req = (this.options.protocol === `${HTTP}${DELIMITER}` ? http : https).request(this.options, res => {
				this.res = res;
				res.setEncoding(UTF8);

				res.on(DATA, chunk => {
					this.body += chunk;
				});

				res.on(END, resolve);
			});

			this.req.on(ERROR, reject);

			if (this.options.body) {
				this.req.write(this.options.body);
			}

			this.req.end();
		});
	}

	/**
	 * Marks a header for reuse from captured headers
	 * @param {string} name - Header name to reuse
	 * @returns {HTTPTest} Returns this instance for chaining
	 */
	reuseHeader (name) {
		if (!this.reuse.has(name)) {
			this.reuse.add(name);
		}

		return this;
	}

	/**
	 * Decorates arg as request body & sets request headers
	 * @param {string|Object|Array} arg - Body to send
	 * @returns {HTTPTest} Returns this instance for chaining
	 */
	send (arg) {
		const type = typeof arg;
		let body = arg;

		if (type !== STRING) {
			try {
				body = JSON.stringify(body, null, 0);

				if (!this.options.headers[CONTENT_TYPE]) {
					this.options.headers[CONTENT_TYPE] = APPLICATION_JSON;
				}
			} catch (e) {
				void 0;
			}
		} else if (quoted.test(body) === false) {
			try {
				body = JSON.stringify(body);
			} catch (e) {
				void 0;
			}
		}

		this.options.body = body;
		this.options.headers[CONTENT_LENGTH] = Buffer.byteLength(body);

		return this;
	}

	/**
	 * Validates that arg is equal to or passes value test
	 * @param {*} arg - Value to test
	 * @param {*} value - Expected value or test function
	 * @param {string} err - Error message if validation fails
	 * @returns {HTTPTest} Returns this instance for chaining
	 * @throws {Error} Throws error if validation fails
	 */
	test (arg, value, err) {
		let valid;

		if (arg instanceof Function) {
			try {
				valid = arg(value) === true;
			} catch (e) {
				valid = false;
			}
		} else if (arg instanceof RegExp) {
			valid = arg !== void 0 && arg.test(value);
		} else if (typeof arg === OBJECT && typeof value === OBJECT) {
			valid = JSON.stringify(arg, null, 0) === JSON.stringify(value, null, 0);
		} else if (!isNaN(arg) && !isNaN(value)) {
			valid = Number(arg) === Number(value);
		} else {
			valid = arg === value;
		}

		if (!valid) {
			throw new Error(err);
		}

		return this;
	}

	/**
	 * Generates a warning message for validation failures
	 * @param {string} type - Type of value being tested
	 * @param {*} a - Expected value
	 * @param {*} b - Actual value
	 * @param {string} k - Key name for headers
	 * @returns {string} Warning message
	 */
	warning (type, a, b, k) {
		const regex = a instanceof RegExp,
			va = regex ? `${a.toString()}.test(res.headers["${k}"])` : JSON.stringify(a),
			vb = regex || JSON.stringify(b);

		return UNEXPECTED_TYPE_A_B.replace(TYPE, type).replace(A, va).replace(B, vb);
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
export function httptest ({url = LOCALHOST, method = GET, body = null, headers = {}, timeout = TIMEOUT} = {}) {
	const type = method.toUpperCase();

	if (http.METHODS.includes(type) === false) {
		throw new Error(INVALID_HTTP_METHOD);
	}

	return new HTTPTest(url, type, headers, body, timeout);
}
