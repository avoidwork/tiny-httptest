# Code Style Guide

This document defines the coding standards for the tiny-httptest project.

## Table of Contents

- [General Principles](#general-principles)
- [File Structure](#file-structure)
- [Naming Conventions](#naming-conventions)
- [Code Formatting](#code-formatting)
- [JSDoc Documentation](#jsdoc-documentation)
- [Error Handling](#error-handling)
- [Testing](#testing)

---

## General Principles

### DRY (Don't Repeat Yourself)
- Extract repeated logic into reusable helper functions
- Use constants for magic values and strings

### YAGNI (You Aren't Gonna Need It)
- Only implement features that are currently needed
- Avoid over-engineering and speculative generalization

### SOLID
- **Single Responsibility**: Each function/class should have one purpose
- **Open/Closed**: Design for extension without modification
- **Liskov Substitution**: Subtypes should be substitutable for their base types
- **Interface Segregation**: Prefer smaller, specific interfaces
- **Dependency Inversion**: Depend on abstractions, not concretions

### OWASP
- Validate all inputs
- No SSRF protections needed for this test framework

---

## File Structure

```
src/
├── constants.js    # Exported constants and configuration
├── helpers.js      # Standalone utility functions
├── httptest.js     # Main class and factory function
└── regex.js        # Regular expression patterns
```

### Module Organization

1. **constants.js**: All shared constants, configuration values, and string literals
2. **helpers.js**: Pure functions that can be tested independently
3. **httptest.js**: Main class (`HTTPTest`) and factory function (`httptest`)
4. **regex.js**: Regular expression patterns used for validation

---

## Naming Conventions

### Files
- Use lowercase with hyphens: `httptest.js`, `helpers.js`

### Classes
- Use PascalCase: `HTTPTest`

### Functions
- Use camelCase: `validateMethod`, `formatBody`, `buildOptions`
- Use descriptive names that indicate action: `validate*`, `format*`, `build*`

### Private Fields
- Use `#` prefix: `#body`, `#expects`, `#headers`
- Declare private fields at the top of the class body

### Constants
- Use UPPER_SNAKE_CASE: `STATUS`, `BODY`, `CONTENT_TYPE`
- Export from `constants.js` for shared use

### Variables
- Use camelCase: `parsed`, `options`, `response`
- Use descriptive names for function parameters

---

## Code Formatting

### Indentation
- Use tabs (configured in `.oxfmtrc.json`)

### Quotes
- Use double quotes for strings: `"application/json"`

### Semicolons
- Required at end of statements

### Spaces
- Space after keywords: `const x = ...`, `function foo() {...}`
- Space after commas: `function(a, b, c)`
- No space before function parentheses: `function foo()`
- Spaces around operators: `a === b`

### Line Length
- Keep lines under 120 characters where practical
- Break long function calls across multiple lines with proper indentation

### Imports
- Group imports by type:
  1. Node.js built-ins
  2. Third-party packages
  3. Local modules
- Sort alphabetically within groups
- Use named imports with alphabetical ordering

```javascript
import http from "node:http";
import https from "node:https";
import {URL} from "node:url";

import {coerce} from "tiny-coerce";

import {CONSTANT_A, CONSTANT_B} from "./constants.js";
import {helperFn} from "./helpers.js";
```

---

## JSDoc Documentation

### Classes

```javascript
/**
 * Description of the class
 * @class
 */
export class HTTPTest {
```

### Functions

```javascript
/**
 * Description of what the function does
 * @param {type} paramName - Description
 * @param {type} [paramWithDefault] - Optional parameter description
 * @returns {type} Description of return value
 * @throws {Error} Description of when error is thrown
 */
export function validateMethod(method) {
```

### Type Annotations
- Use JSDoc type syntax: `{string}`, `{Object}`, `{Array}`, `{boolean}`, `{number}`
- For unions: `{string|Object|Array}`
- For optional: `{type}` with square brackets in parameter name `[param]`
- For any type: `{*}`

---

## Error Handling

### Throwing Errors
- Throw `Error` with descriptive messages
- Use format: `Expected ${type} to be ${expected}, got ${actual}`

### Async Error Handling
- Let promises reject naturally
- Do not swallow errors silently

### Try/Catch
- Only use when recovery is possible
- Re-throw or handle appropriately

---

## Testing

### Test Files
- Place in `tests/` directory
- Use `.test.js` extension

### Test Structure
```javascript
describe("Feature Name", function () {
	it("should do something", function () {
		// Test implementation
	});
});
```

### Coverage
- Run `npm run coverage` for coverage report
- Target: 100% statement coverage

---

## Examples

### Good: Private Field Declaration

```javascript
export class HTTPTest {
	#expects;
	#body = EMPTY;
	#headers = {};
	#status = 0;
	#capture = new Set();

	constructor() {
		this.#expects = new Map();
	}
}
```

### Good: Helper Function Extraction

```javascript
// In helpers.js
export function formatBody(body) {
	if (typeof body === "string") {
		return quoted.test(body) ? body : JSON.stringify(body);
	}
	try {
		return JSON.stringify(body, null, 0);
	} catch {
		return EMPTY;
	}
}
```

### Good: Method Chaining

```javascript
captureHeader(name) {
	this.#capture.add(name);
	return this;
}
```

### Good: Async/Await Pattern

```javascript
async end() {
	this.options.headers = applyReuse(...);
	const response = await this.#request();
	this.#body = response.body;
	// ... process response
	return this;
}
```
