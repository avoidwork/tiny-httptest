const http = require("http"),
	path = require("path"),
	TinyHTTPTest = require(path.join(__dirname, "lib", "tinyhttptest"));

function factory ({url, method = "get", body = null, headers = {}} = {url: "http://localhost", method: "get", body: null, headers: {}}) {
	let obj;

	if (http.METHODS.includes(method.toUpperCase())) {
		 obj = new TinyHTTPTest(url, method, body, headers);
	} else {
		throw new Error("Invalid HTTP method");
	}

	return obj;
}
let x = factory();
module.exports = factory;
