"use strict";

var vows = require("vows");
var assert = require("assert");

var MockWritableStream = require("./lib/writable-stream");

var cli = require("../lib/cli");
var YetiCLI = cli.CLI;

function cliTopic(fn) {
    return function () {
        var topic = {
            fe: null,
            writableStream: new MockWritableStream(),
            log: new MockWritableStream(),
            error: new MockWritableStream(),
            exit: 0
        };

        function mockExit(code) {
            topic.exit = code;
        }


        topic.fe = new YetiCLI({
            writableStream: topic.writableStream,
            readableStream: process.stdin, // FIXME
            putsFn: topic.log.write.bind(topic.log),
            errorFn: topic.error.write.bind(topic.error),
            exitFn: mockExit
        });

        return fn.call(this, topic);
    };
}

vows.describe("Yeti CLI").addBatch({
    "A Yeti CLI without arguments": {
        topic: cliTopic(function (topic) {
            topic.fe.route([
                "node",
                "cli.js"
            ]);

            return topic;
        }),
        "returns usage on stderr": function (topic) {
            assert.ok(topic.error.$store.indexOf("usage:") === 0);
        },
        "returns helpful information on stderr": function (topic) {
            assert.include(topic.error.$store, "launch the Yeti server");
        }
    },
    "A Yeti CLI with --server": {
        topic: cliTopic(function (topic) {
            topic.fe.route([
                "node",
                "cli.js",
                "-s",
                "-p", "9010"
            ]);

            return topic;
        }),
        "returns startup message on stderr": function (topic) {
            assert.ok(topic.error.$store.indexOf("Yeti Hub started") === 0);
        }
    },
    "A Yeti CLI with files": {
        topic: cliTopic(function (topic) {
            var vow = this;
            topic.fe.route([
                "node",
                "cli.js",
                "-p", "9011",
                "fixture/basic.html",
            ]);

            setTimeout(function () {
                vow.callback(null, topic);
            }, 250);
        }),
        "prints hub creation message on stderr": function (topic) {
            assert.ok(topic.error.$store.indexOf("Creating a Hub.") === 0);
        },
        "waits for agents to connect on stderr": function (topic) {
            assert.include(topic.error.$store, "Waiting for agents to connect");
            assert.include(topic.error.$store, "also available locally at");
        },
        "prompts on the writableStream": function (topic) {
            assert.include(topic.writableStream.$store, "When ready, press Enter");
        }
    },
    "parseArgv when given arguments": {
        topic: function () {
            return cli.parseArgv([
                "node", // program name is argv[0]
                "cli.js", // script name is argv[1]
                "--server",
                "--port", "4080",
                "--version",
                "--bogus-does-not-exist", "foo",
                "--hub", "http://example.net:3010",
                "--no-help",
                "--query", "'foo bar'",
                "-vv",
                "test/*/dogcow.html",
                "--",
                "-p/orts.html"
            ]);
        },
        "server should be true": function (topic) {
            assert.isTrue(topic.server);
        },
        "port should be Number(4080)": function (topic) {
            assert.strictEqual(topic.port, 4080);
        },
        "version should be true": function (topic) {
            assert.isTrue(topic.version);
        },
        "help should be false": function (topic) {
            assert.isFalse(topic.help);
        },
        "timeout should not be defined": function (topic) {
            assert.isUndefined(topic.timeout);
        },
        "hub should be a valid URL": function (topic) {
            assert.strictEqual(topic.hub, "http://example.net:3010/");
        },
        "loglevel should be debug": function (topic) {
            assert.strictEqual(topic.loglevel, "debug");
        },
        "remain should be 2 files": function (topic) {
            assert.include(topic.argv.remain, "test/*/dogcow.html");
            assert.include(topic.argv.remain, "-p/orts.html");
        }
    },
    "parseArgv when given Boolean hub shorthand option": {
        topic: function () {
            return cli.parseArgv([
                "node", // program name is argv[0]
                "cli.js", // script name is argv[1]
                "--no-hub"
            ]);
        },
        "hub should be false": function (topic) {
            assert.isFalse(topic.hub);
        }
    },
    "parseArgv when given Boolean hub option": {
        topic: function () {
            return cli.parseArgv([
                "node", // program name is argv[0]
                "cli.js", // script name is argv[1]
                "--hub", "false"
            ]);
        },
        "hub should be false": function (topic) {
            assert.isFalse(topic.hub);
        }
    },
    "parseArgv when given an invalid URL as hub option": {
        topic: function () {
            return cli.parseArgv([
                "node", // program name is argv[0]
                "cli.js", // script name is argv[1]
                "--hub", "clarisworks"
            ]);
        },
        "hub should be true": function (topic) {
            // hub coerced into Boolean
            assert.isTrue(topic.hub);
        }
    }
}).export(module);
