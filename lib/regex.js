const regex = {
	headersGet: /GET\, HEAD\, OPTIONS/,
	headersContentType: /(, )?content-type(, )?/,
	maybeJsonBody: /^"|"$/,
	maybeJsonHeader: /^(application\/(json|(x-)?javascript)|text\/(javascript|x-javascript|x-json))/
};

module.exports = regex;
