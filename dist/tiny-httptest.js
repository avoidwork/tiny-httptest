/**
 * tiny-httptest
 *
 * @copyright 2023 Jason Mulligan <jason.mulligan@avoidwork.com>
 * @license BSD-3-Clause
 * @version 4.0.0
 */
import http from'node:http';import https from'node:https';import {URL}from'node:url';import {coerce}from'tiny-coerce';import {createRequire}from'node:module';const headersGet = /GET\, HEAD\, OPTIONS/;
const headersContentType = /(, )?content-type(, )?/;
const maybeJsonHeader = /^(application\/(json|(x-)?javascript)|text\/(javascript|x-javascript|x-json))/;
const notEmpty = /\w+/;
const quoted = /^".*"$/;const require = createRequire(import.meta.url);
const pkg = require("../package.json");
const {homepage, version} = pkg;

const jar = new Map();
const captured = new Map();
const etags = new Map();
const jsonMimetype = "application/json";

class Httptest {
	constructor (uri, method, headers, body, timeout) {
		const parsed = new URL(uri);

		this.body = "";
		this.capture = new Set();
		this.etag = false;
		this.expects = new Map();

		this.expects.set("status", 0);
		this.expects.set("body", "");
		this.expects.set("headers", new Map());
		this.expects.set("values", new Map());

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

		this.options.headers["user-agent"] = `tiny-httptest bot/${version} (${homepage})`;

		if (parsed.username.trim().length > 0) {
			this.options.auth = `${parsed.username}:${parsed.password}`;
			this.options.headers.authorization = `Basic ${btoa(this.options.auth)}`;
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
		this.options.headers["access-control-request-headers"] = "content-type";

		if (success) {
			this.expectHeader("access-control-allow-methods", headersGet);
			this.expectHeader("access-control-allow-origin", origin);
			this.expectHeader("access-control-allow-credentials", "true");

			if (this.options.method === "OPTIONS") {
				this.expectHeader("access-control-allow-headers", headersContentType);
			} else {
				this.expectHeader("access-control-expose-headers", headersContentType);
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
				const cookie = jar.get(`${this.options.hostname}:${this.options.port}`);

				if (cookie) {
					this.options.headers.cookie = cookie;
				}
			}

			if (this.etag) {
				const etag = etags.get(`${this.options.hostname}:${this.options.port}${this.options.path}`);

				if (etag) {
					this.options.headers["if-none-match"] = etag;
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
		this.expects.set("body", value);

		return this;
	}

	expectHeader (name, value = notEmpty) {
		this.expects.get("headers").set(name.toLowerCase(), value);

		return this;
	}

	expectJson () {
		this.options.headers.accept = jsonMimetype;

		return this.expectHeader("content-type", maybeJsonHeader);
	}

	expectStatus (value = 200) {
		this.expects.set("status", value);

		return this;
	}

	expectValue (name, value) {
		this.expectJson();
		this.expects.get("values").set(name, value);

		return this;
	}

	json (arg = undefined) {
		this.options.headers["content-type"] = jsonMimetype;

		if (arg !== undefined) {
			this.send(arg);
		}

		return this.expectJson();
	}

	process () {
		const body = this.expects.get("body"),
			status = this.expects.get("status");

		this.headers = this.res.headers;
		this.status = this.res.statusCode;

		if (status && this.status !== status) {
			this.test(this.status, status, this.warning("status", this.status, status));
		}

		this.expects.get("headers").forEach((v, k) => this.test(v, this.headers[k], this.warning("header", v, coerce(this.headers[k]), k)));

		if (this.body && maybeJsonHeader.test(this.headers["content-type"] || "")) {
			try {
				this.body = JSON.parse(this.body);
			} catch (e) {
			}
		}

		if (body) {
			this.test(body, this.body, this.warning("body", this.body, body));
		}

		this.expects.get("values").forEach((v, k) => this.test(v, this.body[k], this.warning("body", v, this.body[k])));

		if (this.capture.size > 0) {
			this.capture.forEach(k => {
				if (this.headers[k] !== undefined) {
					captured.set(k, this.headers[k]);
				}
			});
		}

		if (this.jar && this.headers["set-cookie"]) {
			jar.set(this.options.hostname + ":" + this.options.port, this.headers["set-cookie"]);
		}

		if (this.etag && this.headers.etag) {
			etags.set(this.options.hostname + ":" + this.options.port + this.options.path, this.headers.etag);
		}

		return this;
	}

	request () {
		return new Promise((resolve, reject) => {
			this.req = (this.options.protocol === "http:" ? http : https).request(this.options, res => {
				this.res = res;
				res.setEncoding("utf8");

				res.on("data", chunk => {
					this.body += chunk;
				});

				res.on("end", resolve);
			});

			this.req.on("error", reject);

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

		if (type !== "string") {
			try {
				body = JSON.stringify(body, null, 0);

				if (!this.options.headers["content-type"]) {
					this.options.headers["content-type"] = jsonMimetype;
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
		this.options.headers["content-length"] = Buffer.byteLength(body);

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
		} else if (typeof arg === "object" && typeof value === "object") {
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
		const va = a instanceof RegExp ? `${a.toString()}.test(res.headers["${k}"])` : JSON.stringify(a),
			vb = a instanceof RegExp ? true : JSON.stringify(b);

		return `Unexpected ${type} value: ${va} !== ${vb}`;
	}
}

function httptest ({url = "http://localhost", method = "GET", body = null, headers = {}, timeout = 30000, http2 = false} = {}) {
	const type = method.toUpperCase();

	if (http.METHODS.includes(type) === false) {
		throw new Error("Invalid HTTP method");
	}

	return new Httptest(url, type, headers, body, timeout, http2);
}export{httptest};