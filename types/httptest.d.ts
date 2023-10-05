export function httptest({ url, method, body, headers, timeout }?: {
    url?: string;
    method?: string;
    body?: any;
    headers?: {};
    timeout?: number;
}): HTTPTest;
export class HTTPTest {
    constructor(uri: any, method: any, headers: any, body: any, timeout: any);
    body: string;
    capture: any;
    etag: boolean;
    expects: any;
    headers: {};
    options: {
        body: any;
        hostname: any;
        method: any;
        path: string;
        port: any;
        protocol: any;
        headers: any;
        timeout: any;
    };
    jar: boolean;
    req: any;
    res: any;
    reuse: any;
    status: number;
    captureHeader(name: any): this;
    cookies(state?: boolean): this;
    cors(arg: any, success?: boolean): this;
    end(): any;
    etags(state?: boolean): this;
    expectBody(value?: RegExp): this;
    expectHeader(name: any, value?: RegExp): this;
    expectJson(): this;
    expectStatus(value?: number): this;
    expectValue(name: any, value: any): this;
    json(arg?: any): this;
    process(): this;
    request(): any;
    reuseHeader(name: any): this;
    send(arg: any): this;
    test(arg: any, value: any, err: any): this;
    warning(type: any, a: any, b: any, k: any): string;
}
