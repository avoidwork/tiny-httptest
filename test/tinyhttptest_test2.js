const tenso = require("tenso"),
	path = require("path"),
	tinyhttptest = require(path.join(__dirname, "..", "index.js")),
	port = 8010,
	timeout = 5000,
	routes = {
		"get": {
			"/": "Hello world!"
		},
		"post": {
			"/": (req, res) => res.send(req.body)
		}
	};

process.setMaxListeners(0);

tenso({
	http2: true,
	port: port,
	routes: routes,
	logging: {
		level: "error"
	},
	ssl: {
		key: path.join(__dirname, "..", "ssl", "localhost.key"),
		cert: path.join(__dirname, "..", "ssl", "localhost.crt")
	}
});

describe("Implicit proofs (HTTP2)", function () {
	this.timeout(timeout + 1000);

	it("GET / (captures cookie, etag & CSRF token)", function () {
		return tinyhttptest({http2: true, url: "https://localhost:" + port, timeout: timeout})
			.cookies()
			.etags()
			.expectStatus(200)
			.expectHeader("Allow", "GET, HEAD, OPTIONS, POST")
			.expectHeader("content-length", 60)
			.captureHeader("x-csrf-token")
			.expectValue("links", [])
			.expectValue("data", routes.get["/"])
			.expectValue("error", null)
			.expectValue("status", 200)
			.end();
	});

	it("HEAD / (reuses cookie)", function () {
		return tinyhttptest({http2: true, url: "https://localhost:" + port, timeout: timeout, method: "head"})
			.cookies()
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS, POST")
			.expectHeader("content-length", 60)
			.expectBody(/^$/)
			.end();
	});

	it("POST / (reuses cookie, etag & CSRF token)", function () {
		const body = "abc";

		return tinyhttptest({http2: true, url: "https://localhost:" + port, timeout: timeout, method: "post"})
			.cookies()
			.etags()
			.json(body)
			.reuseHeader("x-csrf-token")
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS, POST")
			.expectValue("links", arg => arg.length === 0)
			.expectValue("data", body)
			.expectValue("error", null)
			.expectValue("status", 200)
			.end();
	});

	it("GET / (CORS Pre-flight)", function () {
		return tinyhttptest({http2: true, url: "https://localhost:" + port, method: "OPTIONS"})
			.cors("http://not.localhost:8001")
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS, POST")
			.expectHeader("content-length", 90)
			.end();
	});

	it("GET / (CORS)", function () {
		return tinyhttptest({http2: true, url: "https://localhost:" + port})
			.cors("http://not.localhost:8001")
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS, POST")
			.expectHeader("content-type", "application/json")
			.expectHeader("content-length", 60)
			.expectValue("links", [])
			.expectValue("data", routes.get["/"])
			.expectValue("error", null)
			.expectValue("status", 200)
			.end();
	});
});
