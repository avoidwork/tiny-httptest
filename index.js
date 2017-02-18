const http = require("http"),
	path = require("path"),
	TinyHTTPTest = require(path.join(__dirname, "lib", "tinyhttptest"));

function factory ({url, method = "GET", body = null, headers = {}, timeout = 30000} = {url: "http://localhost", method: "get", body: null, headers: {}, timeout: 30000}) {
	const type = method.toUpperCase();

	let obj;

	if (http.METHODS.includes(type)) {
		 obj = new TinyHTTPTest(url, type, body, headers, timeout);
	} else {
		throw new Error("Invalid HTTP method");
	}

	return obj;
}

module.exports = factory;
