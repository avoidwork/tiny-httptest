const http = require("http"),
	url = require("url"),
	path = require("path"),
	pkg = require(path.join(__dirname, "..", "package.json"));

class TinyHTTPTest {
	constructor (uri, method, headers, body, timeout) {
		const parsed = url.parse(uri);

		this.body = "";
		this.expects = new Map();

		this.expects.set("status", 200);
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

		if (parsed.auth) {
			this.options.auth = parsed.auth;
		}

		if (body) {
			this.options.headers["content-length"] = Buffer.byteLength(body);
		}

		this.options.headers["user-agent"] = "tiny-httptest bot/" + pkg.version + " (" + pkg.homepage + ")";

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
					fn(null, this.body, res.headers);
				} catch (err) {
					fn(err, this.body, res.headers);
				}
			});
		});

		this.req.on("error", err => fn(err, this.body, {}));

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

	expectStatus (value = 200) {
		this.expects.set("status", value);

		return this;
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

	test (arg, value, err) {
		const type = typeof arg;

		let valid = false;

		if (type === "function") {
			try {
				if (arg(value) !== true) {
					valid = false;
				}
			} catch (e) {
				valid = false;
			}
		} else if (type instanceof RegExp && !arg.test(value)) {
			valid = false;
		} else if (type === "object" && typeof value === "object") {
			valid = JSON.stringify(arg, null, 0) === JSON.stringify(value, null, 0);
		} else if (arg !== value) {
			valid = false;
		}

		if (!valid) {
			throw new Error(err);
		}
	}
}

module.exports = TinyHTTPTest;
