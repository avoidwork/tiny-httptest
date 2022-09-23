export const headersGet = /GET\, HEAD\, OPTIONS/;
export const headersContentType = /(, )?content-type(, )?/;
export const maybeJsonHeader = /^(application\/(json|(x-)?javascript)|text\/(javascript|x-javascript|x-json))/;
export const notEmpty = /\w+/;
export const quoted = /^".*"$/;
