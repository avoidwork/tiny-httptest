const regex = {
	maybeJsonBody: /^"|"$/,
	maybeJsonHeader: /^(application\/(json|(x-)?javascript)|text\/(javascript|x-javascript|x-json))/
};

module.exports = regex;
