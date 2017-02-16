const http = require("http"),
	path = require("path"),
	tinyhttptest = require(path.join(__dirname, "lib", "tinyhttptest")),
	methods = http.METHODS;

function factory ({url, method = "get", body = null, headers = {}} = {url: "http://localhost", method: "get", body: null, headers: {}}) {
	let obj;

	if (methods.includes(method.toUpperCase())) {
		obj = http.request();
	} else {
		throw new Error("Invalid HTTP method");
	}

	return obj;
}

module.exports = factory;
