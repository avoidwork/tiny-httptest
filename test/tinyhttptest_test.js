import tenso from "tenso";
import {httptest} from "../dist/tiny-httptest.esm.js";

const port = 8000,
	timeout = 5000,
	routes = {
		"get": {
			"/": "Hello world!"
		},
		post: {
			"/": (req, res) => {
				res.send(req.body);
			}
		}
	};

process.setMaxListeners(0);

const app = tenso({
	port: port,
	routes: routes,
	logging: {
		level: "error"
	}
});

describe("Implicit proofs", function () {
	this.timeout(timeout + 1000);

	it("GET / (captures cookie, etag & CSRF token)", function () {
		return httptest({url: `http://localhost:${port}`, timeout: timeout})
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
		return httptest({url: `http://localhost:${port}`, timeout: timeout, method: "head"})
			.cookies()
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS, POST")
			.expectHeader("content-length", 60)
			.expectBody(/^$/)
			.end();
	});

	it("POST / (reuses cookie, etag & CSRF token)", function () {
		const body = "abc";

		return httptest({url: `http://localhost:${port}`, timeout: timeout, method: "post"})
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
		return httptest({url: `http://localhost:${port}`, method: "OPTIONS"})
			.cors("http://not.localhost:8001")
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS, POST")
			.expectHeader("content-length", undefined)
			.end();
	});

	it("GET / (CORS)", function () {
		return httptest({url: `http://localhost:${port}`})
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

	it("GET https://google.com/ (HTTPS)", function () {
		return httptest({url: "https://google.com/", timeout: timeout})
			.expectStatus(301)
			.end();
	});

	it("It shutdowns down", function (done) {
		app.server.close(() => done());
	});
});
