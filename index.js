const http = require("http"),
	path = require("path"),
	TinyHTTPTest = require(path.join(__dirname, "lib", "tinyhttptest"));

function factory ({url = "http://localhost", method = "GET", body = null, headers = {}, timeout = 30000, http2 = false} = {}) {
	const type = method.toUpperCase();

	if (http.METHODS.includes(type) === false) {
		throw new Error("Invalid HTTP method");
	}

	return new TinyHTTPTest(url, type, headers, body, timeout, http2);
}

module.exports = factory;
