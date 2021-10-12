"use strict";

const regex = {
	headersGet: /GET\, HEAD\, OPTIONS/,
	headersContentType: /(, )?content-type(, )?/,
	maybeJsonHeader: /^(application\/(json|(x-)?javascript)|text\/(javascript|x-javascript|x-json))/,
	notEmpty: /\w+/,
	quoted: /^".*"$/
};

module.exports = regex;
