const http = require("http"),
	url = require("url"),
	path = require("path"),
	pkg = require(path.join(__dirname, "..", "package.json"));

class TinyHTTPTest {
	constructor (uri, method = "get", headers = {}, body = "", timeout = 30000) {
		const parsed = url.parse(uri);

		this.body = "";
		this.expects = new Map();
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

	expect (name, type, value) {
		if (this.expects.has(type)) {
			this.expects.add(type, new Set());
		}

		this.expects.get(type).add({name: name, value: value});

		return this;
	}

	expectBody (value) {
		return this.expect(null, 'body', value);
	}

	expectHeader (name, value) {
		return this.expect(name, 'header', value);
	}

	expectStatus (value) {
		return this.expect(null, 'status', value);
	}

	expectValue (value) {
		return this.expect(null, 'value', value);
	}

	process () {
		this.headers = this.res.headers;
		this.status = this.res.statusCode;

		if (this.expects.has("status") && this.expects.get("status") !== this.status) {
			throw new Error("Unexpected status value: " + this.status + " !== " + this.expects.get("status"));
		}

		/*this.expects.forEach(i => {
			console.log(i);
		});*/
	}
}


module.exports = TinyHTTPTest;
