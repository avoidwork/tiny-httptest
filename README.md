# tiny-httptest
HTTP compliant test framework

[![build status](https://secure.travis-ci.org/avoidwork/tiny-httptest.svg)](http://travis-ci.org/avoidwork/tiny-httptest)

## Example
```javascript
const tinyhttptest = require("tiny-httptest");

// Simulating CORS request to localhost:8000
tinyhttptest({url:"http://localhost:8000", method: "OPTIONS"}).cors().end().then(() => {
	return tinyhttptest({url:"http://localhost:8000"}).cors().expectJson().end();
}).then(() => {
	console.log("CORS is working");
}, () => {
	console.error("CORS is not working");
});
```
## Configuration

#### body
_*(Mixed)*_ HTTP request body, defaults to `null` but can be `String`, `Object` or `Array`.

#### headers
_*(Object)*_ HTTP request headers, defaults to `{}`.

#### method
_*(String)*_ HTTP request method, defaults to `GET`.

#### timeout
_*(Number)*_ HTTP request timeout as milliseconds, defaults to `30000`.

#### url
_*(String)*_ URL & port to request, defaults to `http://localhost`.

## API
**cors([hostname])**
_TinyHTTPTest_

Sets request & response header expectations, defaults to request `hostname` if optional argument is not supplied.

**end()**
_Promise_

Ends the request, `Promise` resolves with `TinyHTTPTest` instance or rejects with `Error`.

**expectBody([value = /\w+/])**
_TinyHTTPTest_

Sets an expectation of the response body, default value is a `RegExp` which tests if there is a response body.

**expectHeader(name, [value = /\w+/])**
_TinyHTTPTest_

Sets an expectation of a response header, default value is a `RegExp` which tests if there is a header value.

**expectJson()**
_TinyHTTPTest_

Sets an expectation of response header `content-type`, supports correct and common incorrect header values.

**expectStatus([value = 200])**
_TinyHTTPTest_

Sets an expectation of response status code, default value is `200`.

**json**
_TinyHTTPTest_

Sets request header to transmit `JSON` & response `content-type` to expect `JSON`.

**process**
_TinyHTTPTest_

Processes the response of the `TinyHTTPTest` instance.

**send(arg)**
_TinyHTTPTest_

Decorates `arg` as request body & sets request headers.
 
 **test(arg, value, err)**
 _TinyHTTPTest_
 
 Validates that `arg` is equal to or passes `value` test, throws `Error` with `err` as message if invalid.

## License
Copyright (c) 2017 Jason Mulligan  
Licensed under the BSD-3 license.
