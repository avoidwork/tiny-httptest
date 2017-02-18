const http = require("http"),
	url = require("url"),
	path = require("path"),
	pkg = require(path.join(__dirname, "..", "package.json"));

class TinyHTTPTest {
	constructor (uri, method, headers, body, timeout) {
		const parsed = url.parse(uri);

		this.body = "";
		this.expects = new Map();

		this.expects.set("status", 0);
		this.expects.set("body", "");
		this.expects.set("headers", new Map());

		this.headers = {};
		this.options = {
			body: body,
			hostname: parsed.hostname,
			uri: uri,
			method: method,
			path: parsed.path,
			port: parsed.hostname,
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

		this.req = null;
		this.res = null;
		this.status = 0;
	}

	end (fn) {
		this.req = http.request(this.options, res => {
			this.res = res;
			res.setEncoding("utf8");

			res.on("data", chunk => {
				this.body += chunk;
			});

			res.on("end", () => {
				try {
					this.process();
					fn(null, this.body, this.headers, this.status);
				} catch (err) {
					fn(err, this.body, this.headers, this.status);
				}
			});
		});

		this.req.on("error", err => fn(err, this.body, this.headers, this.status));

		if (this.options.body) {
			this.req.write(this.options.body);
		}

		this.req.end();
	}

	expectBody (value) {
		this.expects.set("body", value);

		return this;
	}

	expectHeader (name, value) {
		this.expects.get("headers").set(name, value);

		return this;
	}

	expectJson () {
		this.expects.get("headers").set("content-type", /^(application\/(json|(x-)?javascript)|text\/(javascript|x-javascript|x-json))/);

		return this;
	}

	expectStatus (value = 200) {
		this.expects.set("status", value);

		return this;
	}

	json () {
		if (!this.options.headers["content-type"]) {
			this.options.headers["content-type"] = "application/json";
		}

		return this.expectJson();
	}

	process () {
		const status = this.expects.get("status");

		this.headers = this.res.headers;
		this.status = this.res.statusCode;

		if (status && this.status !== status) {
			this.test(this.status, status, "Unexpected status value: " + this.status + " !== " + status);
		}

		this.expects.headers.forEach((v, k) => {
			if (this.headers[k] !== undefined) {
				this.test(v, this.headers[k], "Unexpected header value: " + k + " === " + this.headers[k]);
			} else {
				throw new Error("Header '" + k + "' not found");
			}
		});

		if (this.options.body !== null) {
			this.test(this.options.body, this.body, "Unexpected body value");
		}
	}

	send (arg) {
		const type = typeof arg;
		let body = arg;

		if (type !== "string") {
			try {
				body = JSON.stringify(body, null, 0);

				if (!this.options.headers["content-type"]) {
					this.options.headers["content-type"] = "application/json";
				}
			} catch (e) {
				void 0;
			}
		} else if (type === "string" && /^"|"$/.test(body) && !this.options.headers["content-type"]) {
			this.options.headers["content-type"] = "application/json";
		}

		this.options.headers["content-length"] = Buffer.byteLength(body);
	}

	test (arg, value, err) {
		let valid;

		if (arg instanceof Function) {
			try {
				valid = arg(value) !== true;
			} catch (e) {
				valid = false;
			}
		} else if (arg instanceof RegExp) {
			valid = arg.test(value);
		} else if (typeof arg === "object" && typeof value === "object") {
			valid = JSON.stringify(arg, null, 0) === JSON.stringify(value, null, 0);
		} else {
			valid = arg !== value;
		}

		if (!valid) {
			throw new Error(err);
		}
	}
}

module.exports = TinyHTTPTest;
