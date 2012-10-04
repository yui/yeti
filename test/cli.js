"use strict";

var vows = require("vows");
var assert = require("assert");

var streams = require("./lib/streams");

var cli = require("../lib/cli");
var YetiCLI = cli.CLI;

function cliTopic(fn) {
    return function () {
        var topic = {
            fe: null,
            stdin:  new streams.MockReadableStream(),
            stdout: new streams.MockWritableStream(),
            stderr: new streams.MockWritableStream(),
            exit: 0
        };

        function mockExit(code) {
            topic.exit = code;
        }

        topic.fe = new YetiCLI({
            stdin: topic.stdin,
            stdout: topic.stdout,
            stderr: topic.stderr,
            exitFn: mockExit
        });

        return fn.call(this, topic);
    };
}

vows.describe("Yeti CLI").addBatch({
    "A Yeti CLI without arguments": {
        topic: cliTopic(function (topic) {
            topic.stderr.expect("usage", this.callback);

            topic.fe.route([
                "node",
                "cli.js"
            ]);
        }),
        "returns usage on stderr": function (topic) {
            assert.ok(topic.indexOf("usage:") === 0);
        },
        "returns helpful information on stderr": function (topic) {
            assert.include(topic, "launch the Yeti server");
        }
    },
    "A Yeti CLI with --server": {
        topic: cliTopic(function (topic) {
            topic.stderr.expect("started", this.callback);
            topic.fe.route([
                "node",
                "cli.js",
                "-s",
                "-p", "9010"
            ]);
        }),
        "returns startup message on stderr": function (topic) {
            assert.ok(topic.indexOf("Yeti Hub started") === 0);
        }
    },
    "A Yeti CLI with files": {
        topic: cliTopic(function (topic) {
            topic.stderr.expect("When ready", this.callback);

            topic.fe.route([
                "node",
                "cli.js",
                "-p", "9011",
                "fixture/basic.html",
            ]);
        }),
        "prints hub creation message on stderr": function (topic) {
            assert.ok(topic.indexOf("Creating a Hub.") === 0);
        },
        "waits for agents to connect on stderr": function (topic) {
            assert.include(topic, "Waiting for agents to connect");
            assert.include(topic, "also available locally at");
        },
        "prompts on the writableStream": function (topic) {
            assert.include(topic, "When ready, press Enter");
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
