export type TestBody = string | object | Array<any>;

export type ExpectationValue = RegExp | Function | string | number;

export interface TestOptions {
	url?: string;
	method?: string;
	body?: TestBody;
	headers?: Record<string, any>;
	timeout?: number;
}

export class HTTPTest {
	constructor(uri: string, method: string, headers: Record<string, any>, body: TestBody, timeout: number);

	options: {
		body: TestBody;
		hostname: string;
		method: string;
		path: string;
		port: string | number;
		protocol: string;
		headers: Record<string, any>;
		timeout: number;
	};

	captureHeader(name: string): this;

	cookies(state?: boolean): this;

	cors(arg?: string, success?: boolean): this;

	end(): Promise<this>;

	etags(state?: boolean): this;

	expectBody(value?: ExpectationValue): this;

	expectHeader(name: string, value?: ExpectationValue): this;

	expectJson(): this;

	expectStatus(value?: number): this;

	expectValue(name: string, value: any): this;

	json(arg?: TestBody): this;

	process(): this;

	reuseHeader(name: string): this;

	send(arg: TestBody): this;

	test(arg: any, value: any, err: string): this;

	warning(type: string, a: any, b: any, k?: string): string;
}

export function httptest(options?: TestOptions): HTTPTest;
