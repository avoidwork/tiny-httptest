# Tiny HTTP Test

tiny-httptest is a lightweight HTTP test framework that makes it easy to validate CORS is working, capture cookies & HTTP response headers (including etags) and reuse them for sequential tests.

## Using the factory

```javascript
import {httptest} from "tiny-httptest";

describe('HTTP Tests', () => {
 it("GET /somefile (Captured the etag)", function () {
  return httptest({url: `http://localhost:${port}/somefile`})
          .etags()
          .expectStatus(200)
          .end();
 });

 it("GET /somefile (Reused the ETag)", function () {
  return httptest({url: `http://localhost:${port}/somefile`})
          .etags()
          .expectStatus(304)
          .end();
 });

 it("GET /invalid-file", function () {
  return httptest({url: `http://localhost:${port}/invalid-file`})
          .expectStatus(404)
          .end();
 });
});
```

## Using the Class

```javascript
import {HTTPTest} from "tiny-httptest";
class MyTestRunner extends HTTPTest {}
```

## Testing

Tiny HTTP Test has 100% code coverage with its tests.  Run `npm run test-setup` after installing modules.

```console
  Implicit proofs
    √ Starting test server
    √ GET / (captures cookie, CSRF token)
    √ HEAD / (reuses cookie)
    √ POST / (reuses cookie & CSRF token)
    √ POST / (reuses cookie & CSRF token + body)
    √ POST / (reuses cookie & CSRF token + body)
    √ GET / (CORS Pre-flight)
    √ GET / (CORS)
    √ GET /invalid (CORS)
    √ GET / (Basic Auth)
    √ GET https://google.com/ (HTTPS) (94ms)
    √ GET /assets/css/style.css
    √ GET /assets/css/style.css (ETag)
    √ Stopping test server

  Error proofs
    √ Starting test server
    √ GET https://invalid.local.dev/ (DNS error)
    √ INVALID / (Invalid HTTP method)
    √ GET /hello (Error thrown)
    √ GET /assets/css/style.css (Invalid 404)
    √ Stopping test server


  20 passing (160ms)

-------------------|---------|----------|---------|---------|-----------------------------------------------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------|---------|----------|---------|---------|-----------------------------------------------------------
All files          |     100 |    81.13 |     100 |     100 |                                                          
 tiny-httptest.cjs |     100 |    81.13 |     100 |     100 | 16-22,111,125-130,177,193,211-227,247,262,303,318-323,371
-------------------|---------|----------|---------|---------|-----------------------------------------------------------
```

## Options

### body

HTTP request body, defaults to `null` but can be `String`, `Object` or `Array`.

### headers

HTTP request headers, defaults to `{}`.

### method

HTTP request method, defaults to `GET`.

### timeout
HTTP request timeout as milliseconds, defaults to `30000`.

### url
URL & port to request, defaults to `http://localhost`.

## API

### captureHeader(name)

Captures a header to be reused by another instance of `TinyHTTPTest`.

### cookies([state = true])

Enables or disables cookie capture & reuse.

### cors([hostname, success = true])

Sets request & response header expectations, defaults to request `hostname` if optional argument is not supplied.

If testing an error case, you must specify the second parameter as `false` to not expect CORS headers.

### end()

Ends the request, `Promise` resolves with `TinyHTTPTest` instance or rejects with `Error`.

### etags([state = true])

Enables or disables ETag capture & reuse.

### expectBody([value = /\w+/])

Sets an expectation of the response body, default value is a `RegExp` which tests if there is a response body.

### expectHeader(name, [value = /\w+/])

Sets an expectation of a response header, default value is a `RegExp` which tests if there is a header value.

### expectJson()

Sets an expectation of response header `content-type`, supports correct and common incorrect header values.

### expectStatus([value = 200])

Sets an expectation of response status code, default value is `200`.

### json([arg])

Sets request & response to `JSON`, sends `arg` if not `undefined`.

### process()

Processes the response of the `TinyHTTPTest` instance.

### reuseHeader(name)

Reuses a captured header from another instance of `TinyHTTPTest`.

### send(arg)

Decorates `arg` as request body & sets request headers.

### test(arg, value, err)
 
Validates that `arg` is equal to or passes `value` test, throws `Error` with `err` as message if invalid.

## License
Copyright (c) 2023 Jason Mulligan
Licensed under the BSD-3 license.
