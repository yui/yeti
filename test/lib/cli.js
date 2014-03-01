"use strict";

var streams = require("mock-utf8-stream");

var EventEmitter2 = require("../../lib/event-emitter");
var CLI = require("../../lib/cli").CLI;

module.exports = function cliTopic(fn) {
    return function () {
        var vow = this,
            topic,
            emitter = new EventEmitter2();

        topic = {
            fe: null,
            stdin:  new streams.MockReadableStream(),
            stdout: new streams.MockWritableStream(),
            stderr: new streams.MockWritableStream(),
            emitter: emitter
        };

        function mockExit(code) {
            emitter.emit("exit", code);
        }

        topic.fe = new CLI({
            stdin: topic.stdin,
            stdout: topic.stdout,
            stderr: topic.stderr,
            exitFn: mockExit
        });

        return fn.call(vow, topic);
    };
};
