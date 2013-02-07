"use strict";

var vows = require("vows");
var assert = require("assert");

var TestServer = require("../../lib/hub/test-server");

function MockServerResponse() {
    this.headers = null;
    this.code = null;
    this.buffer = null;
}

MockServerResponse.prototype.writeHead = function (code, headers) {
    this.code = code;
    this.headers = headers;
};

MockServerResponse.prototype.end = function (buffer) {
    if (buffer) { this.buffer = buffer; }
};

function MockServerRequest(method) {
    this.method = method;
}

function createMockPair(method) {
    return {
        req: new MockServerRequest(method),
        res: new MockServerResponse()
    };
}

vows.describe("HTML Injector Server").addBatch({
    "Given a TestServer": {
        topic: function () {
            var topic = {};

            topic.payload = '<script src="foo.js"></script>';

            topic.startTime = (new Date()).getTime();

            topic.ts = new TestServer(topic.payload);

            return topic;
        },
        "is ok": function (topic) {
            if (topic instanceof Error) { throw topic; }
        },
        "calling serve for a GET for a JS file does not inject script": function (topic) {
            var server = createMockPair("GET"),
                buffer = new Buffer("while (1);"),
                expiresTime,
                dateTime;

            topic.ts.serve(server, "evil.js", false, buffer);

            assert.include(server.res.headers, "Content-Length");
            assert.include(server.res.headers, "Content-Type");
            assert.include(server.res.headers, "Expires");
            assert.include(server.res.headers, "Date");

            assert.strictEqual(server.res.buffer.toString("utf8"), buffer.toString("utf8"));
            assert.strictEqual(server.res.code, 200);
            assert.strictEqual(server.res.headers["Content-Type"], "application/javascript; charset=utf-8");
            assert.strictEqual(server.res.headers["Content-Length"], buffer.length);

            expiresTime = Date.parse(server.res.headers.Expires);
            dateTime = Date.parse(server.res.headers.Date);
            assert.strictEqual(expiresTime - dateTime, 240000, "Expires time should be 4 minutes from Date header");
            // dateTime is second accurate, but startTime is millisecond accurate -- be fuzzy
            assert(Math.abs(dateTime - topic.startTime) < 1500, "Date header may be incorrect");
        }
    }
}).export(module);
