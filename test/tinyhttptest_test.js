const tenso = require("tenso"),
	path = require("path"),
	tinyhttptest = require(path.join(__dirname, "..", "index.js")),
	port = 8000,
	timeout = 5000,
	routes = {
		"get": {
			"/": "Hello world!"
		},
		"post": {
			"/": (req, res) => {
				res.send(req.body);
			}
		}
	};

process.setMaxListeners(0);

tenso({
	port: port,
	routes: routes,
	logging: {
		level: "error"
	}
});

describe("Implicit proofs", function () {
	this.timeout(timeout + 1000);

	it("GET / (captures cookie & CSRF token)", function () {
		return tinyhttptest({url: "http://localhost:" + port, timeout: timeout})
			.cookies()
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS, POST")
			.captureHeader("x-csrf-token")
			.expectValue("links", [])
			.expectValue("data", routes.get["/"])
			.expectValue("error", null)
			.expectValue("status", 200)
			.end();
	});

	it("POST / (reuses cookie & CSRF token)", function () {
		const body = "abc";

		return tinyhttptest({url: "http://localhost:" + port, timeout: timeout, method: "post"})
			.cookies()
			.json(body)
			.reuseHeader("x-csrf-token")
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS, POST")
			.expectValue("links", [])
			.expectValue("data", body)
			.expectValue("error", null)
			.expectValue("status", 200)
			.end();
	});
});
