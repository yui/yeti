"use strict";

var vows = require("vows");
var assert = require("assert");

var streams = require("./lib/streams");
var hub = require("./lib/hub");

var cli = require("../lib/cli");
var YetiCLI = cli.CLI;

function cliTopic(fn) {
    return function () {
        var vow = this,
            context,
            topic;

        topic = {
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

        context = {
            callback: function (err, expectedString) {
                vow.callback(err, {
                    output: expectedString,
                    config: topic
                });
            }
        };

        return fn.call(context, topic);
    };
}

function expectThenCallback(vow, stream, expectedString, mixins) {
    stream.expect(expectedString, function (err, finalString) {
        var topic = {
            output: finalString
        };

        if (mixins) {
            Object.keys(mixins).forEach(function (key) {
                topic[key] = mixins[key];
            });
        }

        vow.callback(err, topic);
    });
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
            assert.ok(topic.output.indexOf("usage:") === 0);
        },
        "returns helpful information on stderr": function (topic) {
            assert.include(topic.output, "launch the Yeti server");
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
            assert.ok(topic.output.indexOf("Yeti Hub started") === 0);
        }
    },
    "A Yeti CLI with files": {
        topic: cliTopic(function (topic) {
            topic.stderr.expect("When ready", this.callback);

            topic.fe.route([
                "node",
                "cli.js",
                "-p", "9011",
                __dirname + "/fixture/basic.html",
            ]);
        }),
        "prints hub creation message on stderr": function (topic) {
            assert.ok(topic.output.indexOf("Creating a Hub.") === 0);
        },
        "waits for agents to connect on stderr": function (topic) {
            assert.include(topic.output, "Waiting for agents to connect");
            assert.include(topic.output, "also available locally at");
        },
        "prompts on the writableStream": function (topic) {
            assert.include(topic.output, "When ready, press Enter");
        },
        "a browser": hub.phantomContext({
            "visits Yeti": {
                topic: function (browser, cli) {
                    var vow = this;

                    expectThenCallback(vow, cli.config.stderr, "Agent connected");

                    function onPageOpen(err, status) {
                        if (err) {
                            vow.callback(err);
                        }
                    }

                    browser.createPage(function (err, page) {
                        page.open("http://localhost:9011", onPageOpen);
                    });
                },
                "is ok": function (topic) {
                    assert.isUndefined(topic.stack);
                },
                "the stderr output contains the User-Agent": function (topic) {
                    assert.include(topic.output, "Mozilla");
                },
                "when Enter is pressed": {
                    topic: function (connectionSnapshot, browser, cli) {
                        expectThenCallback(this, cli.config.stdout, "pass");

                        cli.config.stdin.write("\n"); // Enter
                    },
                    "is ok": function (topic) {
                        assert.isUndefined(topic.stack);
                    },
                    "the stderr output contains the test results": function (topic) {
                        assert.include(topic.output, "1 tests passed");
                    },
                    "the stderr output contains Agent complete": function (topic) {
                        assert.include(topic.output, "Agent complete");
                    }
                }
            }
        })
    },
    "A Yeti CLI with a failing file": {
        topic: cliTopic(function (topic) {
            topic.stderr.expect("When ready", this.callback);

            topic.fe.route([
                "node",
                "cli.js",
                "-p", "9012",
                __dirname + "/fixture/query-string.html",
            ]);
        }),
        "prints hub creation message on stderr": function (topic) {
            assert.ok(topic.output.indexOf("Creating a Hub.") === 0);
        },
        "waits for agents to connect on stderr": function (topic) {
            assert.include(topic.output, "Waiting for agents to connect");
            assert.include(topic.output, "also available locally at");
        },
        "prompts on the writableStream": function (topic) {
            assert.include(topic.output, "When ready, press Enter");
        },
        "a browser": hub.phantomContext({
            "visits Yeti": {
                topic: function (browser, cli) {
                    var vow = this;

                    expectThenCallback(vow, cli.config.stderr, "Agent connected");

                    function onPageOpen(err, status) {
                        if (err) {
                            vow.callback(err);
                        }
                    }

                    browser.createPage(function (err, page) {
                        page.open("http://localhost:9012", onPageOpen);
                    });
                },
                "is ok": function (topic) {
                    assert.isUndefined(topic.stack);
                },
                "the stderr output contains the User-Agent": function (topic) {
                    assert.include(topic.output, "Mozilla");
                },
                "when Enter is pressed": {
                    topic: function (connectionSnapshot, browser, cli) {
                        expectThenCallback(this, cli.config.stdout, "failed");

                        cli.config.stdin.write("\n"); // Enter
                    },
                    "is ok": function (topic) {
                        assert.isUndefined(topic.stack);
                    },
                    "the stderr output contains the failing test details": function (topic) {
                        assert.include(topic.output, "testMoof");
                        assert.include(topic.output, "Values should be equal.");
                        assert.include(topic.output, "Expected: moof (string)");
                        assert.include(topic.output, "Actual: ? (string)");
                        assert.include(topic.output, "1 of 1 tests failed");
                    },
                    "the stderr output contains Agent complete": function (topic) {
                        assert.include(topic.output, "Agent complete");
                    }
                }
            }
        })
    }
}).addBatch({
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
