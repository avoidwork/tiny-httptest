# tiny-httptest
HTTP compliant test framework

[![build status](https://secure.travis-ci.org/avoidwork/tiny-httptest.svg)](http://travis-ci.org/avoidwork/tiny-httptest)

## Example
```javascript
const tinyhttptest = require("tiny-httptest");

// Simulating CORS request to localhost:8000
Promise.all([
	tinyhttptest({url:"http://localhost:8000", method: "OPTIONS"}).cors().end(),
    tinyhttptest({url:"http://localhost:8000"}).expectJson().cors().end()
]).then(() => {
	console.log("CORS is working");
	process.exit(0);
}, () => {
	console.error("CORS is not working");
	process.exit(1);
});
```

## API
In progress

## License
Copyright (c) 2017 Jason Mulligan  
Licensed under the BSD-3 license.
