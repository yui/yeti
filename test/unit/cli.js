"use strict";

var vows = require("vows");
var assert = require("assert");

var streams = require("../lib/streams");

var CLI = require("../../lib/cli").CLI;

var EventEmitter = require("events").EventEmitter;

vows.describe("Yeti CLI").addBatch({
    "Given a Yeti CLI": {
        topic: function () {
            return new CLI({
                stdin: new streams.MockReadableStream(),
                stdout: new streams.MockWritableStream(),
                stderr: new streams.MockWritableStream(),
                process: new EventEmitter()
            });
        },
        "is ok": function (topic) {
            if (topic instanceof Error) { throw topic; }
        },
        "calling setupExceptionHandler works as expected": function (cli) {
            var mockProcess = cli.process;
            assert.lengthOf(mockProcess.listeners("uncaughtException"), 0);
            cli.setupExceptionHandler();
            assert.lengthOf(mockProcess.listeners("uncaughtException"), 1);
            cli.setupExceptionHandler();
            assert.lengthOf(mockProcess.listeners("uncaughtException"), 1, "Only one handler should be installed.");
        }
    }
}).export(module);
