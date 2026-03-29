# API Reference

Complete API documentation for tiny-httptest.

## Table of Contents

- [Factory Function](#factory-function)
- [HTTPTest Class](#httptest-class)
  - [Constructor](#constructor)
  - [Public Methods](#public-methods)
  - [Public Properties](#public-properties)
  - [Private Fields](#private-fields)

---

## Factory Function

### `httptest(options)`

Creates a new HTTP test request instance.

**Parameters:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `url` | `string` | `"http://localhost"` | URL to request |
| `method` | `string` | `"GET"` | HTTP method (GET, POST, PUT, DELETE, etc.) |
| `body` | `string\|Object\|Array\|null` | `null` | Request body |
| `headers` | `Object` | `{}` | Request headers |
| `timeout` | `number` | `30000` | Request timeout in milliseconds |

**Returns:** `HTTPTest`

**Throws:** `Error` if method is not valid

**Example:**

```javascript
import {httptest} from "tiny-httptest";

const test = httptest({
	url: "http://localhost:8000/api/users",
	method: "POST",
	body: {name: "John"},
	headers: {"X-Custom-Header": "value"},
	timeout: 5000
});
```

---

## HTTPTest Class

The main class for creating and executing HTTP test requests.

### Constructor

#### `new HTTPTest(uri, method, headers, body, timeout)`

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `uri` | `string` | The URL to request |
| `method` | `string` | The HTTP method |
| `headers` | `Object` | Request headers |
| `body` | `string\|Object\|Array` | Request body |
| `timeout` | `number` | Request timeout in milliseconds |

---

### Public Methods

All public methods return `this` for method chaining, except `end()` which returns a Promise.

#### `captureHeader(name)`

Captures a response header for reuse in subsequent tests.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Header name to capture |

**Returns:** `HTTPTest`

**Example:**

```javascript
await httptest({url})
	.captureHeader("x-csrf-token")
	.expectStatus(200)
	.end();
```

#### `cookies(state = true)`

Enables or disables cookie capture and reuse across requests.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `state` | `boolean` | `true` | Whether to enable cookie jar |

**Returns:** `HTTPTest`

**Example:**

```javascript
await httptest({url})
	.cookies()
	.expectStatus(200)
	.end();
```

#### `cors(hostname, success = true)`

Sets CORS request and response header expectations.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `hostname` | `string` | `this.options.hostname` | Origin hostname |
| `success` | `boolean` | `true` | Whether to expect CORS headers |

**Returns:** `HTTPTest`

**Example:**

```javascript
// Pre-flight request
await httptest({url, method: "OPTIONS"})
	.cors("http://localhost:8001")
	.expectStatus(200)
	.end();

// Actual request
await httptest({url})
	.cors("http://localhost:8001")
	.expectStatus(200)
	.end();

// CORS error case
await httptest({url})
	.cors("http://localhost:8001", false)
	.expectStatus(403)
	.end();
```

#### `end()`

Executes the HTTP request, validates all expectations, and returns the result.

**Returns:** `Promise<HTTPTest>`

**Throws:** `Error` if any expectation fails

**Example:**

```javascript
await httptest({url})
	.expectStatus(200)
	.expectHeader("content-type", "application/json")
	.end();
```

#### `etags(state = true)`

Enables or disables ETag capture and reuse across requests.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `state` | `boolean` | `true` | Whether to enable ETag handling |

**Returns:** `HTTPTest`

**Example:**

```javascript
// First request captures ETag
await httptest({url})
	.etags()
	.expectStatus(200)
	.end();

// Second request reuses ETag (expects 304 Not Modified)
await httptest({url})
	.etags()
	.expectStatus(304)
	.end();
```

#### `expectBody(value = /\w+/)`

Sets an expectation for the response body.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `value` | `RegExp\|Function\|string` | `/\w+/` | Expected body or test function |

**Returns:** `HTTPTest`

**Example:**

```javascript
// Exact match
await httptest({url})
	.expectBody("Hello world")
	.end();

// Regular expression
await httptest({url})
	.expectBody(/hello/i)
	.end();

// Custom validation function
await httptest({url})
	.expectBody(body => body.length > 0)
	.end();
```

#### `expectHeader(name, value = /\w+/)`

Sets an expectation for a response header.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `name` | `string` | - | Header name |
| `value` | `RegExp\|Function\|string` | `/\w+/` | Expected value or test |

**Returns:** `HTTPTest`

**Example:**

```javascript
// Exact match
await httptest({url})
	.expectHeader("content-type", "application/json")
	.end();

// Regular expression
await httptest({url})
	.expectHeader("x-powered-by", /express/i)
	.end();
```

#### `expectJson()`

Sets an expectation that the response has a JSON content-type header.

**Returns:** `HTTPTest`

**Example:**

```javascript
await httptest({url})
	.expectJson()
	.expectValue("status", 200)
	.end();
```

#### `expectStatus(value = 200)`

Sets an expectation for the response status code.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `value` | `number` | `200` | Expected status code |

**Returns:** `HTTPTest`

**Example:**

```javascript
await httptest({url})
	.expectStatus(200)
	.end();

await httptest({url})
	.expectStatus(404)
	.end();
```

#### `expectValue(name, value)`

Sets an expectation for a JSON value at the specified key in the response body.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | JSON key name |
| `value` | `*` | Expected value |

**Returns:** `HTTPTest`

**Example:**

```javascript
await httptest({url})
	.expectJson()
	.expectValue("status", 200)
	.expectValue("data", {id: 1})
	.expectValue("links", arr => arr.length === 0)
	.end();
```

#### `json(arg)`

Sets request and response content-type to JSON, optionally sends a body.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `arg` | `*` | JSON body to send (optional) |

**Returns:** `HTTPTest`

**Example:**

```javascript
// Set JSON content-type only
await httptest({url, method: "POST"})
	.json()
	.end();

// Set JSON content-type and send body
await httptest({url, method: "POST"})
	.json({key: "value"})
	.end();
```

#### `reuseHeader(name)`

Marks a header for reuse from previously captured headers.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Header name to reuse |

**Returns:** `HTTPTest`

**Example:**

```javascript
// First test captures the token
await httptest({url})
	.captureHeader("x-csrf-token")
	.end();

// Subsequent test reuses the token
await httptest({url, method: "POST"})
	.json({data: "test"})
	.reuseHeader("x-csrf-token")
	.end();
```

#### `send(arg)`

Sets the request body and updates content headers automatically.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `arg` | `string\|Object\|Array` | Body to send |

**Returns:** `HTTPTest`

**Example:**

```javascript
// Plain text body
await httptest({url, method: "POST"})
	.send("plain text body")
	.end();

// JSON body (automatically stringified)
await httptest({url, method: "POST"})
	.send({key: "value"})
	.end();
```

---

### Public Properties

#### `options`

**Type:** `Object`

Request options containing:

| Property | Type | Description |
|----------|------|-------------|
| `body` | `string` | Request body |
| `hostname` | `string` | Request hostname |
| `method` | `string` | HTTP method |
| `path` | `string` | Request path |
| `port` | `string\|number` | Request port |
| `protocol` | `string` | Request protocol (http/https) |
| `headers` | `Object` | Request headers |
| `timeout` | `number` | Request timeout |

---

### Private Fields

These fields are encapsulated and should not be accessed directly.

| Field | Type | Description |
|-------|------|-------------|
| `#body` | `string` | Response body |
| `#capture` | `Set<string>` | Headers to capture |
| `#etag` | `boolean` | ETag handling enabled |
| `#expects` | `Map` | Expectations map |
| `#headers` | `Object` | Response headers |
| `#jar` | `boolean` | Cookie jar enabled |
| `#reuse` | `Set<string>` | Headers to reuse |
| `#status` | `number` | Response status code |
