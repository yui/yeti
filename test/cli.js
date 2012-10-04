"use strict";

var vows = require("vows");
var assert = require("assert");

var cli = require("../lib/cli");

vows.describe("Yeti CLI").addBatch({
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
