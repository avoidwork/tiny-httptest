class TinyHTTPTest {
	constructor (url, method, body, headers) {
		this.url = url;
		this.method = method;
		this.body = body;
		this.headers = headers;
		this.expectations = new Set();
		this.request = null;
	}

	end (fn) {
		this.request(this.url, {method: this.method})
	}

	expect (name, type, value) {
		this.expectations.add({name: name, type: type, value: value});

		return this;
	}
	expectBody (value) {
		return this.expect(null, 'body', value);
	}

	expectHeader (name, value) {
		return this.expect(name, 'header', value);
	}

	expectStatus (value) {
		return this.expect(null, 'status', value);
	}

	expectValue (value) {
		return this.expect(null, 'value', value);
	}

	request (url, options) {
		this.request = undefined;
	}

	process () {
		this.expectations.forEach(i => {
			console.log(i);
		});
	}

	use (arg, next) {

	}
}


module.exports = TinyHTTPTest;
