"use strict";

const http = require("http"),
	{URL} = require("url"),
	path = require("path"),
	btoa = require("btoa"),
	regex = require(path.join(__dirname, "regex.js")),
	{homepage, version} = require(path.join(__dirname, "..", "package.json")),
	jar = new Map(),
	captured = new Map(),
	etags = new Map(),
	jsonMimetype = "application/json";

let http2;

try {
	http2 = require("http2");
} catch (e) {
	http2 = null;
}

class TinyHTTPTest {
	constructor (uri, method, headers, body, timeout, isHttp2) {
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
		this.http2 = isHttp2;
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
			this.expectHeader("access-control-allow-methods", regex.headersGet);
			this.expectHeader("access-control-allow-origin", origin);
			this.expectHeader("access-control-allow-credentials", "true");

			if (this.options.method === "OPTIONS") {
				this.expectHeader("access-control-allow-headers", regex.headersContentType);
			} else {
				this.expectHeader("access-control-expose-headers", regex.headersContentType);
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

			if (!this.req) {
				const cmd = this.http2 ? this.http2Request : this.http1Request;

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

				if (this.http2 && http2 === null) {
					reject(new Error("http2 is not available"));
				} else {
					cmd.call(this).then(() => done(), done);
				}
			} else {
				done();
			}
		});
	}

	etags (state = true) {
		this.etag = state;

		return this;
	}

	expectBody (value = regex.notEmpty) {
		this.expects.set("body", value);

		return this;
	}

	expectHeader (name, value = regex.notEmpty) {
		this.expects.get("headers").set(name.toLowerCase(), value);

		return this;
	}

	expectJson () {
		this.options.headers.accept = jsonMimetype;

		return this.expectHeader("content-type", regex.maybeJsonHeader);
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

	http1Request () {
		return new Promise((resolve, reject) => {
			this.req = http.request(this.options, res => {
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

	http2Request () {
		return new Promise((resolve, reject) => {
			const client = http2.connect(`${this.options.protocol || "https://"}${this.options.hostname}:${this.options.port}`, {rejectUnauthorized: false}),
				doned = err => {
					client.destroy();
					reject(err);
				};

			client.on("error", doned);
			client.on("socketError", doned);

			this.options.headers[":path"] = this.options.path;
			this.options.headers[":method"] = this.options.method;

			this.req = client.request(this.options.headers);
			this.req.setEncoding("utf8");
			this.res = {headers: {}, statusCode: 0};

			this.req.on("response", headers => {
				const dupe = JSON.parse(JSON.stringify(headers));

				this.res.statusCode = dupe[":status"];

				Object.keys(dupe).filter(i => regex.http2MetaHeader.test(i)).forEach(i => {
					delete dupe[i];
				});

				this.res.headers = dupe;

				if (this.options.method === "HEAD" || (/^(204|301|302|304|307|308)$/).test(this.res.statusCode)) {
					resolve();
				}
			});

			if (this.options.method !== "HEAD") {
				this.req.on("data", chunk => {
					this.body += chunk;
					resolve();
				});
			}

			this.req.on("end", () => client.destroy());

			if (this.options.body !== null) {
				this.req.write(this.options.body);
			}

			this.req.end();
		});
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

		this.expects.get("headers").forEach((v, k) => this.test(v, this.headers[k], this.warning("header", v, this.headers[k])));

		if (this.body && regex.maybeJsonHeader.test(this.headers["content-type"] || "")) {
			try {
				this.body = JSON.parse(this.body);
			} catch (e) {
				void 0;
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
				void 0;
			}
		} else if (regex.quoted.test(body) === false) {
			try {
				body = JSON.stringify(body);
			} catch (e) {
				void 0;
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

	warning (type, a, b) {
		return `Unexpected ${type} value: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`;
	}
}

module.exports = TinyHTTPTest;
