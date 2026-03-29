# Agent Guide for tiny-httptest

This document provides guidance for AI agents and developers working on the tiny-httptest project.

## Project Overview

**tiny-httptest** is a lightweight HTTP test framework for Node.js that makes it easy to validate CORS, capture cookies, reuse ETags, and chain HTTP test expectations.

### Key Features
- HTTP/HTTPS request testing
- Cookie jar for stateful tests
- ETag capture and reuse
- Header capture and reuse
- CORS validation
- Basic auth support
- 100% code coverage target

## Project Structure

```
├── src/
│   ├── constants.js    # Shared constants and configuration
│   ├── helpers.js      # Standalone utility functions
│   ├── httptest.js     # Main HTTPTest class and httptest factory
│   ├── regex.js        # Regular expression patterns
│   └── shared.js       # Shared state (jar, captured, etags)
├── tests/
│   ├── tinyhttptest_test.js  # Test suite
│   └── www/            # Test webroot
├── types/
│   └── httptest.d.ts   # TypeScript definitions
├── docs/
│   └── CODE_STYLE.md   # Code style guide
├── package.json
├── oxlint.json         # Linting configuration
└── .oxfmtrc.json       # Formatting configuration
```

## API Reference

### HTTPTest Class

```javascript
import {HTTPTest} from "tiny-httptest";

const test = new HTTPTest(url, method, headers, body, timeout);
```

#### Public Methods (Chainable)

| Method | Description |
|--------|-------------|
| `captureHeader(name)` | Capture a response header for reuse |
| `cookies(state?)` | Enable/disable cookie jar (default: true) |
| `cors(hostname?, success?)` | Set CORS expectations |
| `etags(state?)` | Enable/disable ETag handling (default: true) |
| `expectBody(value?)` | Set response body expectation |
| `expectHeader(name, value?)` | Set header expectation |
| `expectJson()` | Expect JSON content-type |
| `expectStatus(value?)` | Set status code expectation (default: 200) |
| `expectValue(name, value)` | Expect JSON value at key |
| `json(arg?)` | Set JSON content-type, optionally send body |
| `reuseHeader(name)` | Mark header for reuse from captured |
| `send(arg)` | Set request body |

#### Public Methods (Async)

| Method | Description |
|--------|-------------|
| `end()` | Execute request, validate expectations, resolve with this |

#### Public Properties

| Property | Type | Description |
|----------|------|-------------|
| `options` | Object | Request options (hostname, method, path, etc.) |

#### Private Fields (Do Not Access Directly)

- `#body` - Response body
- `#capture` - Set of headers to capture
- `#etag` - ETag handling enabled
- `#expects` - Map of expectations
- `#headers` - Response headers
- `#jar` - Cookie jar enabled
- `#reuse` - Set of headers to reuse
- `#status` - Response status code

### Factory Function

```javascript
import {httptest} from "tiny-httptest";

httptest({
  url: "http://localhost:8000/api",
  method: "GET",
  body: null,
  headers: {},
  timeout: 30000
});
```

## Development Workflow

### npm Scripts

| Script | Description |
|--------|-------------|
| `npm run lint` | Run oxlint and oxfmt checks |
| `npm run fix` | Auto-fix linting and formatting |
| `npm run build` | Build dist and run mocha tests |
| `npm run rollup` | Bundle with rollup |
| `npm run mocha` | Run mocha test suite |
| `npm run coverage` | Run coverage test |
| `npm run types` | Generate TypeScript definitions |
| `npm test` | Run lint + build |

### Pre-commit Hook

The project uses husky with a pre-commit hook that runs:
1. `npm run fix` - Auto-fix linting/formatting
2. `npm run coverage` - Run coverage tests
3. `git add -A` - Stage all changes

## Code Conventions

### Follow docs/CODE_STYLE.md

Key points:
- **Tabs** for indentation (configured in `.oxfmtrc.json`)
- **Double quotes** for strings
- **camelCase** for functions/variables
- **PascalCase** for classes
- **UPPER_SNAKE_CASE** for constants
- **Private fields** use `#` prefix
- **JSDoc** for all public APIs

### File Organization

1. **constants.js**: All shared constants
2. **helpers.js**: Pure utility functions
3. **httptest.js**: Main class and factory
4. **regex.js**: Regex patterns

### Naming Patterns

- Validation functions: `validate*`
- Formatting functions: `format*`
- Building functions: `build*`
- Test methods: `expect*`, `capture*`, `reuse*`

## Testing Guidelines

### Test Structure

```javascript
import {httptest} from "../dist/tiny-httptest.cjs";

describe("Feature Name", function () {
	it("should do something", function () {
		return httptest({url: `http://localhost:${port}/path`})
			.cookies()
			.expectStatus(200)
			.expectHeader("content-type", "application/json")
			.end();
	});
});
```

### Coverage Requirements

- Target: 100% statement coverage
- Run: `npm run coverage`
- Output: `coverage.txt`

## Common Tasks

### Adding a New Helper Function

1. Add to `src/helpers.js`
2. Export with JSDoc
3. Import in `src/httptest.js`
4. Add tests in `tests/tinyhttptest_test.js`

### Adding a New Class Method

1. Add public method to `HTTPTest` class
2. Use private fields with `#`
3. Return `this` for chaining
4. Add JSDoc with `@returns {HTTPTest}`
5. Update `types/httptest.d.ts`

### Modifying Constants

1. Add to `src/constants.js`
2. Export the constant
3. Import where needed

## Build Process

1. **Source**: `src/httptest.js` + helpers
2. **Bundle**: rollup creates `dist/tiny-httptest.js` and `.cjs`
3. **Types**: TypeScript generates `types/httptest.d.ts`
4. **Test**: mocha runs against built output

## Dependencies

### Runtime
- `tiny-coerce` - Type coercion utility

### Dev
- `oxlint` - Fast linter
- `oxfmt` - Fast formatter
- `rollup` - Bundle tool
- `woodland` - Test framework
- `husky` - Git hooks
- `auto-changelog` - Changelog generator

## Git Workflow

- Branch: `tweaks` (current development)
- Commits: Use `--no-verify` to skip pre-commit hook during development
- Push: Standard git push after commit

## Troubleshooting

### ESLint not found
Run `npm install` to install dependencies.

### Tests failing
Run `npm run coverage` for detailed test output.

### Build issues
Run `npm run fix` first to auto-fix formatting/linting.
