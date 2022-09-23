export function httptest({ url, method, body, headers, timeout, http2 }?: {
    url?: string;
    method?: string;
    body?: any;
    headers?: {};
    timeout?: number;
    http2?: boolean;
}): Httptest;
declare class Httptest {
    constructor(uri: any, method: any, headers: any, body: any, timeout: any);
    body: string;
    capture: Set<any>;
    etag: boolean;
    expects: Map<any, any>;
    headers: {};
    options: {
        body: any;
        hostname: string;
        method: any;
        path: string;
        port: string;
        protocol: string;
        headers: any;
        timeout: any;
    };
    jar: boolean;
    req: any;
    res: any;
    reuse: Set<any>;
    status: number;
    captureHeader(name: any): Httptest;
    cookies(state?: boolean): Httptest;
    cors(arg: any, success?: boolean): Httptest;
    end(): Promise<any>;
    etags(state?: boolean): Httptest;
    expectBody(value?: RegExp): Httptest;
    expectHeader(name: any, value?: RegExp): Httptest;
    expectJson(): Httptest;
    expectStatus(value?: number): Httptest;
    expectValue(name: any, value: any): Httptest;
    http1Request(): Promise<any>;
    json(arg?: any): Httptest;
    process(): Httptest;
    reuseHeader(name: any): Httptest;
    send(arg: any): Httptest;
    test(arg: any, value: any, err: any): Httptest;
    warning(type: any, a: any, b: any, k: any): string;
}
export {};
