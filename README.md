# tiny-httptest

[![npm version](https://img.shields.io/npm/v/tiny-httptest.svg)](https://www.npmjs.com/package/tiny-httptest)
[![License](https://img.shields.io/npm/l/tiny-httptest.svg)](LICENSE)

Lightweight HTTP test framework for Node.js that makes it easy to validate CORS, capture cookies & headers (including ETags), and chain test expectations.

## Features

- HTTP/HTTPS request testing
- Cookie jar for stateful tests
- ETag capture and reuse
- Header capture and reuse
- CORS validation
- Basic auth support
- 100% code coverage

## Installation

```bash
npm install tiny-httptest --save-dev
```

## Quick Start

```javascript
import {httptest} from "tiny-httptest";

describe("HTTP Tests", function () {
	it("should capture ETag", async function () {
		await httptest({url: `http://localhost:${port}/somefile`})
			.etags()
			.expectStatus(200)
			.end();
	});

	it("should reuse ETag", async function () {
		await httptest({url: `http://localhost:${port}/somefile`})
			.etags()
			.expectStatus(304)
			.end();
	});

	it("should handle 404", async function () {
		await httptest({url: `http://localhost:${port}/invalid-file`})
			.expectStatus(404)
			.end();
	});
});
```

## API

### Factory Function

#### `httptest(options)`

Creates a new HTTP test request.

```javascript
import {httptest} from "tiny-httptest";

const test = httptest({
	url: "http://localhost:8000/api",  // Default: http://localhost
	method: "GET",                      // Default: GET
	body: null,                         // Default: null
	headers: {},                        // Default: {}
	timeout: 30000                      // Default: 30000
});
```

### HTTPTest Class

All methods return `this` for chaining, except `end()` which returns a Promise.

#### `captureHeader(name)`

Captures a response header for reuse in subsequent tests.

```javascript
await httptest({url})
	.captureHeader("x-csrf-token")
	.expectStatus(200)
	.end();
```

#### `cookies(state = true)`

Enables or disables cookie capture and reuse.

```javascript
await httptest({url})
	.cookies()
	.expectStatus(200)
	.end();
```

#### `cors(hostname, success = true)`

Sets CORS request and response header expectations.

```javascript
// Expect CORS headers for preflight
await httptest({url, method: "OPTIONS"})
	.cors("http://localhost:8001")
	.expectStatus(200)
	.end();

// Expect CORS headers on actual request
await httptest({url})
	.cors("http://localhost:8001")
	.expectStatus(200)
	.end();

// Test CORS error case
await httptest({url})
	.cors("http://localhost:8001", false)
	.expectStatus(403)
	.end();
```

#### `end()`

Executes the request and validates all expectations. Returns a Promise that resolves with the HTTPTest instance or rejects with an Error.

```javascript
await httptest({url})
	.expectStatus(200)
	.end();
```

#### `etags(state = true)`

Enables or disables ETag capture and reuse.

```javascript
// First request captures ETag
await httptest({url})
	.etags()
	.expectStatus(200)
	.end();

// Second request reuses ETag (expects 304)
await httptest({url})
	.etags()
	.expectStatus(304)
	.end();
```

#### `expectBody(value = /\w+/)`

Sets an expectation for the response body.

```javascript
await httptest({url})
	.expectBody("Hello world")
	.end();

await httptest({url})
	.expectBody(/hello/i)
	.end();

await httptest({url})
	.expectBody(body => body.length > 0)
	.end();
```

#### `expectHeader(name, value = /\w+/)`

Sets an expectation for a response header.

```javascript
await httptest({url})
	.expectHeader("content-type", "application/json")
	.end();

await httptest({url})
	.expectHeader("x-powered-by", /express/i)
	.end();
```

#### `expectJson()`

Sets an expectation that the response has a JSON content-type.

```javascript
await httptest({url})
	.expectJson()
	.expectValue("status", 200)
	.end();
```

#### `expectStatus(value = 200)`

Sets an expectation for the response status code.

```javascript
await httptest({url})
	.expectStatus(200)
	.end();

await httptest({url})
	.expectStatus(404)
	.end();
```

#### `expectValue(name, value)`

Sets an expectation for a JSON value in the response body.

```javascript
await httptest({url})
	.expectJson()
	.expectValue("status", 200)
	.expectValue("data", {id: 1})
	.end();

await httptest({url})
	.expectJson()
	.expectValue("links", arr => arr.length === 0)
	.end();
```

#### `json(arg)`

Sets request and response content-type to JSON, optionally sends a body.

```javascript
// Set JSON content-type
await httptest({url, method: "POST"})
	.json()
	.end();

// Set JSON content-type and send body
await httptest({url, method: "POST"})
	.json({key: "value"})
	.end();
```

#### `reuseHeader(name)`

Reuses a previously captured header in the request.

```javascript
// First test captures the token
await httptest({url})
	.captureHeader("x-csrf-token")
	.expectStatus(200)
	.end();

// Subsequent test reuses the token
await httptest({url, method: "POST"})
	.json({data: "test"})
	.reuseHeader("x-csrf-token")
	.expectStatus(200)
	.end();
```

#### `send(arg)`

Sets the request body and updates content headers.

```javascript
await httptest({url, method: "POST"})
	.send("plain text body")
	.expectStatus(200)
	.end();

await httptest({url, method: "POST"})
	.send({key: "value"})
	.expectStatus(200)
	.end();
```

### Class Extension

You can extend the HTTPTest class for custom test runners:

```javascript
import {HTTPTest} from "tiny-httptest";

class MyTestRunner extends HTTPTest {
	// Add custom methods
	customMethod() {
		// ...
		return this;
	}
}
```

## Running Tests

```bash
npm test
```

## Coverage

```bash
npm run coverage
```

## License

Copyright (c) 2026 Jason Mulligan
Licensed under the BSD-3-Clause license.
