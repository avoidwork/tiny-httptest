import {coerce} from "tiny-coerce";
import {headersContentType, maybeJsonHeader, notEmpty, quoted} from "./regex.js";
import {
	ACCESS_CONTROL_ALLOW_CREDENTIALS,
	ACCESS_CONTROL_ALLOW_HEADERS,
	ACCESS_CONTROL_ALLOW_ORIGIN,
	ACCESS_CONTROL_EXPOSE_HEADERS,
	ACCESS_CONTROL_REQUEST_HEADERS,
	APPLICATION_JSON,
	BASIC,
	CONTENT_LENGTH,
	CONTENT_TYPE,
	DELIMITER,
	EMPTY,
	HEADER,
	HTTP,
	IF_NONE_MATCH,
	INVALID_HTTP_METHOD,
	OPTIONS,
	SET_COOKIE,
	STATUS,
	TRUE,
	USER_AGENT,
	USER_AGENT_VALUE,
	UTF8
} from "./constants.js";
import {captured, etags, jar} from "./shared.js";

export const PROTOCOL_DELIMITER = `${HTTP}${DELIMITER}`;

/**
 * Validates HTTP method
 * @param {string} method - HTTP method to validate
 * @returns {string} Uppercase method
 * @throws {Error} If method is invalid
 */
export function validateMethod(method) {
	const type = method.toUpperCase();
	if (!http.METHODS.includes(type)) {
		throw new Error(INVALID_HTTP_METHOD);
	}
	return type;
}

/**
 * Validates and formats request body
 * @param {string|Object|Array} body - Body to validate
 * @returns {string} Stringified body
 */
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

/**
 * Builds request options with defaults
 * @param {URL} parsed - Parsed URL
 * @param {string} method - HTTP method
 * @param {Object} headers - Request headers
 * @param {string|Object|Array} body - Request body
 * @param {number} timeout - Request timeout
 * @returns {Object} Request options
 */
export function buildOptions(parsed, method, headers, body, timeout) {
	const options = {
		hostname: parsed.hostname,
		method,
		path: `${parsed.pathname}${parsed.search}`,
		port: parsed.port,
		protocol: parsed.protocol,
		headers: {
			...headers,
			[USER_AGENT]: USER_AGENT_VALUE
		},
		timeout
	};

	if (parsed.username?.trim()) {
		options.auth = `${parsed.username}${DELIMITER}${parsed.password}`;
		options.headers.authorization = BASIC.replace("%A", Buffer.from(options.auth).toString("base64"));
	}

	if (body) {
		const formatted = formatBody(body);
		options.body = formatted;
		options.headers[CONTENT_LENGTH] = Buffer.byteLength(formatted);
	}

	return options;
}

/**
 * Validates an expectation against actual value
 * @param {string} type - Type of value being tested
 * @param {*} expected - Expected value
 * @param {*} actual - Actual value
 * @returns {boolean} True if valid
 */
export function test(expected, actual) {
	if (expected instanceof Function) {
		try {
			return expected(actual) === true;
		} catch {
			return false;
		}
	}
	if (expected instanceof RegExp) {
		return expected.test(actual);
	}
	if (typeof expected === "object" && typeof actual === "object") {
		return JSON.stringify(expected, null, 0) === JSON.stringify(actual, null, 0);
	}
	if (typeof expected === "number" && typeof actual === "number") {
		return Number(expected) === Number(actual);
	}
	return expected === actual;
}

/**
 * Formats error message for validation failures
 * @param {string} type - Type of value being tested
 * @param {*} expected - Expected value
 * @param {*} actual - Actual value
 * @returns {string} Error message
 */
export function formatError(type, expected, actual) {
	const exp = expected instanceof RegExp ? expected.toString() : JSON.stringify(expected);
	const act = actual === undefined ? "undefined" : JSON.stringify(actual);
	return `Expected ${type} to be ${exp}, got ${act}`;
}

/**
 * Processes header expectations
 * @param {Map} headers - Header expectations
 * @param {Object} actualHeaders - Actual response headers
 * @param {Function} validateFn - Validation callback
 */
export function validateHeaders(headers, actualHeaders, validateFn) {
	for (const [name, expected] of headers) {
		validateFn(`${HEADER} "${name}"`, expected, coerce(actualHeaders[name]));
	}
}

/**
 * Processes body expectations
 * @param {*} expected - Expected body value
 * @param {string} body - Response body
 * @param {Object} headers - Response headers
 * @param {Function} validateFn - Validation callback
 * @returns {string|Object} Parsed body if JSON
 */
export function validateBody(expected, body, headers, validateFn) {
	if (expected && maybeJsonHeader.test(headers[CONTENT_TYPE] || EMPTY)) {
		try {
			body = JSON.parse(body);
		} catch {
			// Keep as string if not valid JSON
		}
	}
	if (expected) {
		validateFn(BODY, expected, body);
	}
	return body;
}

/**
 * Processes JSON value expectations
 * @param {Map} values - Value expectations
 * @param {Object} body - Parsed response body
 * @param {Function} validateFn - Validation callback
 */
export function validateValues(values, body, validateFn) {
	for (const [name, expected] of values) {
		validateFn(BODY, expected, body[name]);
	}
}

/**
 * Captures response state for reuse
 * @param {Set} capture - Headers to capture
 * @param {Object} headers - Response headers
 * @param {boolean} jar - Cookie jar enabled
 * @param {boolean} etag - ETag enabled
 * @param {string} hostname - Request hostname
 * @param {string|number} port - Request port
 * @param {string} path - Request path
 */
export function captureState(capture, headers, jar, etag, hostname, port, path) {
	for (const name of capture) {
		if (headers[name] !== undefined) {
			captured.set(name, headers[name]);
		}
	}

	if (jar && headers[SET_COOKIE]) {
		jar.set(`${hostname}${DELIMITER}${port}`, headers[SET_COOKIE]);
	}

	if (etag && headers.etag) {
		etags.set(`${hostname}${DELIMITER}${port}${path}`, headers.etag);
	}
}

/**
 * Applies reusable state (cookies, etags, captured headers)
 * @param {boolean} jar - Cookie jar enabled
 * @param {boolean} etag - ETag enabled
 * @param {Set} reuse - Headers to reuse
 * @param {string} hostname - Request hostname
 * @param {string|number} port - Request port
 * @param {string} path - Request path
 * @param {Object} headers - Request headers
 * @returns {Object} Updated headers
 */
export function applyReuse(jar, etag, reuse, hostname, port, path, headers) {
	const key = `${hostname}${DELIMITER}${port}`;

	if (jar) {
		const cookie = jar.get(key);
		if (cookie) {
			headers.cookie = cookie;
		}
	}

	if (etag) {
		const etagValue = etags.get(`${key}${path}`);
		if (etagValue) {
			headers[IF_NONE_MATCH] = etagValue;
		}
	}

	for (const name of reuse) {
		if (captured.has(name)) {
			headers[name] = captured.get(name);
		}
	}

	return headers;
}

/**
 * Removes CORS headers from expectations for error responses
 * @param {Map} headers - Header expectations
 */
export function removeCorsHeaders(headers) {
	for (const key of [ACCESS_CONTROL_ALLOW_ORIGIN, ACCESS_CONTROL_REQUEST_HEADERS, ACCESS_CONTROL_ALLOW_HEADERS, ACCESS_CONTROL_ALLOW_CREDENTIALS, ACCESS_CONTROL_EXPOSE_HEADERS]) {
		headers.delete(key);
	}
}
