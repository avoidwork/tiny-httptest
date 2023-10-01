import tenso from "tenso";
import {join} from "path";
import {httptest} from "../dist/tiny-httptest.cjs";
import * as url from "url";
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

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

describe("Implicit proofs", function () {
	beforeEach(() => {
		this.timeout(timeout + 1000);
	});

	let app;

	it("Starting test server", function (done) {
		app = tenso({
			port: port,
			routes: routes,
			logging: {
				level: "error"
			},
			etags: {enabled: true},
			root: join(__dirname, "www")
		});
		done();
	});

	it("GET / (captures cookie, CSRF token)", function () {
		return httptest({url: `http://localhost:${port}`, timeout: timeout})
			.cookies()
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

	it("POST / (reuses cookie & CSRF token)", function () {
		const body = "abc";

		return httptest({url: `http://localhost:${port}`, timeout: timeout, method: "post"})
			.cookies()
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

	it("POST / (reuses cookie & CSRF token + body)", function () {
		const body = "abc";

		return httptest({url: `http://localhost:${port}`, timeout: timeout, method: "post", body: JSON.stringify({abc: true})})
			.cookies()
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

	it("GET / (Basic Auth)", function () {
		return httptest({url: `http://user:pass@localhost:${port}`})
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

	it("GET /file", function () {
		return httptest({url: `http://localhost:${port}/assets/css/style.css`})
			.etags()
			.expectStatus(200)
			.end();
	});

	it("GET /file (ETag)", function () {
		return httptest({url: `http://localhost:${port}/assets/css/style.css`})
			.etags()
			.expectStatus(304)
			.end();
	});

	it("Stopping test server", function (done) {
		app.server.close(() => done());
	});
});

describe("Error proofs", function () {
	beforeEach(() => {
		this.timeout(timeout + 1000);
	});

	let app;

	it("Starting test server", function (done) {
		app = tenso({
			port: port,
			routes: routes,
			logging: {
				level: "error"
			}
		});
		done();
	});

	it("GET https://invalid.local.dev/ (DNS error)", function () {
		return httptest({url: "https://invalid.local.dev/", timeout: timeout})
			.end().catch(() => true);
	});

	it("GET /hello (Error thrown)", function () {
		return httptest({url: `http://localhost:${port}/hello`, timeout: timeout})
			.expectBody(() => {
				throw new Error("Test error");
			})
			.end().catch(() => true);
	});

	it("Stopping test server", function (done) {
		app.server.close(() => done());
	});
});
