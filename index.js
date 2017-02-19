const http = require("http"),
	path = require("path"),
	TinyHTTPTest = require(path.join(__dirname, "lib", "tinyhttptest"));

function factory ({url = "http://localhost", method = "GET", body = null, headers = {}, timeout = 30000} = {}) {
	const type = method.toUpperCase();

	if (http.METHODS.includes(type)) {
		return new TinyHTTPTest(url, type, headers, body, timeout);
	} else {
		throw new Error("Invalid HTTP method");
	}
}

module.exports = factory;
