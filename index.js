const http = require("http"),
	path = require("path"),
	TinyHTTPTest = require(path.join(__dirname, "lib", "tinyhttptest"));

function factory ({url, method = "get", body = null, headers = {}, timeout = 30000} = {url: "http://localhost", method: "get", body: null, headers: {}, timeout: 30000}) {
	let obj;

	if (http.METHODS.includes(method.toUpperCase())) {
		 obj = new TinyHTTPTest(url, method, body, headers, timeout);
	} else {
		throw new Error("Invalid HTTP method");
	}

	return obj;
}

module.exports = factory;
