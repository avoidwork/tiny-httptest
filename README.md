# tiny-httptest
HTTP compliant test framework

[![build status](https://secure.travis-ci.org/avoidwork/tiny-httptest.svg)](http://travis-ci.org/avoidwork/tiny-httptest)

## Example
```javascript
const tinyhttptest = require("tiny-httptest");

// Simulating CORS request to localhost:8000
Promise.all([
	tinyhttptest({url:"http://localhost:8000", method: "OPTIONS"}).cors().end(),
    tinyhttptest({url:"http://localhost:8000"}).cors().expectJson().end()
]).then(() => {
	console.log("CORS is working");
	process.exit(0);
}, () => {
	console.error("CORS is not working");
	process.exit(1);
});
```
## Configuration
The factory method receives an `Object` of request options.

#### body
_*(Mixed)*_ HTTP request body, defaults to `null` but can be `String`, `Object` or `Array`

#### headers
_*(Object)*_ HTTP request headers, defaults to `{}`

#### method
_*(String)*_ HTTP request method, defaults to `GET`

#### timeout
_*(Number)*_ HTTP request timeout as milliseconds, defaults to `30000`

#### url
_*(String)*_ URL & port to request, defaults to `http://localhost`

{url: "http://localhost", method: "GET", body: null, headers: {}, timeout: 30000}

## API
**cors([hostname])**
_TinyHTTPTest_

Sets request headers & response header expectations, defaults to request `hostname` if optional argument is not supplied.

## License
Copyright (c) 2017 Jason Mulligan  
Licensed under the BSD-3 license.
