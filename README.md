# Tiny HTTP Test
### Lightweight HTTP/HTTP2 compliant test framework
tiny-httptest makes it easy to validate CORS is working, capture cookies & HTTP response headers (including etags) and reuse them for sequential tests.

[![build status](https://secure.travis-ci.org/avoidwork/tiny-httptest.svg)](http://travis-ci.org/avoidwork/tiny-httptest)

## Example
```javascript
const tinyhttptest = require("tiny-httptest");

// Simulating CORS request to localhost:8000

tinyhttptest({url:"http://localhost:8000", method: "OPTIONS"})
	.cors("http://not.localhost:8001")
	.end()
	.then(() => tinyhttptest({url:"http://localhost:8000"}).cors("http://not.localhost:8001").expectJson().end())
	.then(() => console.log("CORS is working"))
	.catch(e => console.error(`CORS is not working: ${e.message}`));
```
## Configuration

#### body
_*(Mixed)*_ HTTP request body, defaults to `null` but can be `String`, `Object` or `Array`.

#### headers
_*(Object)*_ HTTP request headers, defaults to `{}`.

#### http2
_*(Boolean)*_ Enables HTTP2 requests, defaults to `false`.

#### method
_*(String)*_ HTTP request method, defaults to `GET`.

#### timeout
_*(Number)*_ HTTP request timeout as milliseconds, defaults to `30000`.

#### url
_*(String)*_ URL & port to request, defaults to `http://localhost`.

## API
**captureHeader(name)**
_TinyHTTPTest_

Captures a header to be reused by another instance of `TinyHTTPTest`.

**cookies([state = true])**
_TinyHTTPTest_

Enables or disables cookie capture & reuse.

**cors([hostname])**
_TinyHTTPTest_

Sets request & response header expectations, defaults to request `hostname` if optional argument is not supplied.

**end()**
_Promise_

Ends the request, `Promise` resolves with `TinyHTTPTest` instance or rejects with `Error`.

**etags([state = true])**
_TinyHTTPTest_

Enables or disables ETag capture & reuse.

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

**json([arg])**
_TinyHTTPTest_

Sets request & response to `JSON`, sends `arg` if not `undefined`.

**process**
_TinyHTTPTest_

Processes the response of the `TinyHTTPTest` instance.

**reuseHeader(name)**
_TinyHTTPTest_

Reuses a captured header from another instance of `TinyHTTPTest`.

**send(arg)**
_TinyHTTPTest_

Decorates `arg` as request body & sets request headers.
 
 **test(arg, value, err)**
 _TinyHTTPTest_
 
 Validates that `arg` is equal to or passes `value` test, throws `Error` with `err` as message if invalid.

## License
Copyright (c) 2018 Jason Mulligan
Licensed under the BSD-3 license.
