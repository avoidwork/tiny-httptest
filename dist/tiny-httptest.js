/**
 * tiny-httptest
 *
 * @copyright 2023 Jason Mulligan <jason.mulligan@avoidwork.com>
 * @license BSD-3-Clause
 * @version 4.0.0
 */
import http from'node:http';import https from'node:https';import {URL}from'node:url';import {coerce}from'tiny-coerce';import {createRequire}from'module';const headersGet = /GET\, HEAD\, OPTIONS/;
const headersContentType = /(, )?content-type(, )?/;
const maybeJsonHeader = /^(application\/(json|(x-)?javascript)|text\/(javascript|x-javascript|x-json))/;
const notEmpty = /\w+/;
const quoted = /^".*"$/;const require = createRequire(import.meta.url);
const pkg = require("../package.json");
const {homepage, version} = pkg;

const STATUS = "status";
const BODY = "body";
const HEADERS = "headers";
const HEADER = "header";
const VALUES = "values";
const EMPTY = "";
const USER_AGENT = "user-agent";
const USER_AGENT_VALUE = `tiny-httptest bot/${version} (${homepage})`;
const APPLICATION_JSON = "application/json";
const TRUE = "true";
const ACCESS_CONTROL_ALLOW_ORIGIN = "access-control-allow-origin";
const ACCESS_CONTROL_REQUEST_HEADERS = "access-control-request-headers";
const ACCESS_CONTROL_ALLOW_METHODS = "access-control-allow-methods";
const ACCESS_CONTROL_ALLOW_HEADERS = "access-control-allow-headers";
const ACCESS_CONTROL_ALLOW_CREDENTIALS = "access-control-allow-credentials";
const ACCESS_CONTROL_EXPOSE_HEADERS = "access-control-expose-headers";
const CONTENT_TYPE = "content-type";
const OPTIONS = "OPTIONS";
const IF_NONE_MATCH = "if-none-match";
const SET_COOKIE = "set-cookie";
const DELIMITER = ":";
const HTTP = "http";
const UTF8 = "utf8";
const DATA = "data";
const END = "end";
const ERROR = "error";
const STRING = "string";
const CONTENT_LENGTH = "content-length";
const OBJECT = "object";
const GET = "GET";
const TIMEOUT = 30000;
const LOCALHOST = "http://localhost";
const INVALID_HTTP_METHOD = "Invalid HTTP method";
const UNEXPECTED_TYPE_A_B = "Unexpected %TYPE value: %A !== %B";
const TYPE = "%TYPE";
const A = "%A";
const B = "%B";
const BASIC = "Basic %A";const jar = new Map();
const captured = new Map();
const etags = new Map();class HTTPTest {
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

	captureHeader (name) {
		if (!this.capture.has(name)) {
			this.capture.add(name);
		}

		return this;
	}

	cookies (state = true) {
		this.jar = state;

		return this;
	}

	cors (arg, success = true) {
		const origin = arg || this.options.hostname;

		this.options.headers.origin = origin;
		this.options.headers[ACCESS_CONTROL_REQUEST_HEADERS] = CONTENT_TYPE;

		if (success) {
			this.expectHeader(ACCESS_CONTROL_ALLOW_METHODS, headersGet);
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

	etags (state = true) {
		this.etag = state;

		return this;
	}

	expectBody (value = notEmpty) {
		this.expects.set(BODY, value);

		return this;
	}

	expectHeader (name, value = notEmpty) {
		this.expects.get(HEADERS).set(name.toLowerCase(), value);

		return this;
	}

	expectJson () {
		this.options.headers.accept = APPLICATION_JSON;

		return this.expectHeader(CONTENT_TYPE, maybeJsonHeader);
	}

	expectStatus (value = 200) {
		this.expects.set(STATUS, value);

		return this;
	}

	expectValue (name, value) {
		this.expectJson();
		this.expects.get(VALUES).set(name, value);

		return this;
	}

	json (arg = undefined) {
		this.options.headers[CONTENT_TYPE] = APPLICATION_JSON;

		if (arg !== undefined) {
			this.send(arg);
		}

		return this.expectJson();
	}

	process () {
		const body = this.expects.get(BODY),
			status = this.expects.get(STATUS);

		this.headers = this.res.headers;
		this.status = this.res.statusCode;

		if (status && this.status !== status) {
			this.test(this.status, status, this.warning(STATUS, this.status, status));
		}

		this.expects.get(HEADERS).forEach((v, k) => this.test(v, this.headers[k], this.warning(HEADER, v, coerce(this.headers[k]), k)));

		if (this.body && maybeJsonHeader.test(this.headers[CONTENT_TYPE] || EMPTY)) {
			try {
				this.body = JSON.parse(this.body);
			} catch (e) {
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

	reuseHeader (name) {
		if (!this.reuse.has(name)) {
			this.reuse.add(name);
		}

		return this;
	}

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
			}
		} else if (quoted.test(body) === false) {
			try {
				body = JSON.stringify(body);
			} catch (e) {
			}
		}

		this.options.body = body;
		this.options.headers[CONTENT_LENGTH] = Buffer.byteLength(body);

		return this;
	}

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

	warning (type, a, b, k) {
		const regex = a instanceof RegExp,
			va = regex ? `${a.toString()}.test(res.headers["${k}"])` : JSON.stringify(a),
			vb = regex || JSON.stringify(b);

		return UNEXPECTED_TYPE_A_B.replace(TYPE, type).replace(A, va).replace(B, vb);
	}
}

function httptest ({url = LOCALHOST, method = GET, body = null, headers = {}, timeout = TIMEOUT} = {}) {
	const type = method.toUpperCase();

	if (http.METHODS.includes(type) === false) {
		throw new Error(INVALID_HTTP_METHOD);
	}

	return new HTTPTest(url, type, headers, body, timeout);
}export{HTTPTest,httptest};