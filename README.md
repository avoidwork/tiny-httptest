# tiny-httptest
HTTP compliant test framework

[![build status](https://secure.travis-ci.org/avoidwork/tiny-httptest.svg)](http://travis-ci.org/avoidwork/tiny-httptest)

## Example
```javascript
const tinyhttptest = require("tiny-httptest");

// Simulating CORS request to localhost:8000
Promise.all([
	tinyhttptest({url:"http://localhost:8000", method: "OPTIONS"}).cors().end(),
    tinyhttptest({url:"http://localhost:8000"}).expectJson().cors().end(err => {
        if (err) {
            console.error(err.stack);
            process.exit(1);
        } else {
            console.log("Finished test");
            process.exit(0);
        }
    })
]).then(() => {
	console.log("CORS is working");
}, () => {
	console.error("CORS is not working");
});
```

## API
In progress

## License
Copyright (c) 2017 Jason Mulligan  
Licensed under the BSD-3 license.
