const http = require("http"),
	url = require("url"),
	path = require("path"),
	regex = require(path.join(__dirname, "regex.js")),
	pkg = require(path.join(__dirname, "..", "package.json")),
	jar = new Map(),
	captured = new Map(),
	etags = new Map(),
	jsonMimetype = "application/json";

class TinyHTTPTest {
	constructor (uri, method, headers, body, timeout) {
		const parsed = url.parse(uri);

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
			uri: uri,
			method: method,
			path: parsed.path,
			port: parsed.port,
			protocol: parsed.protocol,
			headers: headers,
			timeout: timeout
		};

		this.options.headers["user-agent"] = "tiny-httptest bot/" + pkg.version + " (" + pkg.homepage + ")";

		if (parsed.auth) {
			this.options.auth = parsed.auth;
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

	cors (arg) {
		const origin = arg || this.options.hostname;

		this.options.headers.origin = origin;
		this.options.headers["content-type"] = "fetch";
		this.expectHeader("access-control-allow-methods", regex.headersGet);
		this.expectHeader("access-control-allow-headers", regex.headersContentType);
		this.expectHeader("access-control-expose-headers", regex.headersContentType);
		this.expectHeader("access-control-allow-origin", origin);

		return this;
	}

	end () {
		return new Promise((resolve, reject) => {
			const done = err => {
				if (err) {
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

			let cookie, etag;

			if (!this.req) {
				if (this.jar) {
					cookie = jar.get(this.options.hostname + ":" + this.options.port);

					if (cookie) {
						this.options.headers.cookie = cookie;
					}
				}

				if (this.etag) {
					etag = etags.get(this.options.hostname + ":" + this.options.port + this.options.path);

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

				this.req = http.request(this.options, res => {
					this.res = res;
					res.setEncoding("utf8");

					res.on("data", chunk => {
						this.body += chunk;
					});

					res.on("end", done);
				});

				this.req.on("error", done);

				if (this.options.body) {
					this.req.write(this.options.body);
				}

				this.req.end();
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
			this.test(this.status, status, "Unexpected status value: " + this.status + " !== " + status);
		}

		this.expects.get("headers").forEach((v, k) => this.test(v, this.headers[k], "Unexpected header value: " + k + " = " + this.headers[k]));

		if (this.body && regex.maybeJsonHeader.test(this.headers["content-type"] || "")) {
			try {
				this.body = JSON.parse(this.body);
			} catch (e) {
				void 0;
			}
		}

		if (body) {
			this.test(body, this.body, "Unexpected body value: " + this.body + " !== " + body);
		}

		this.expects.get("values").forEach((v, k) => this.test(v, this.body[k], "Unexpected body value: " + v + " !== " + this.body[k]));

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
			valid = arg.test(value);
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
}

module.exports = TinyHTTPTest;
