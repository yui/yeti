"use strict";

var vows = require("vows");
var assert = require("assert");

var portfinder = require("portfinder");

var hub = require("../lib/hub");
var cliTopic = require("../lib/cli");

var EventEmitter2 = require("../../lib/event-emitter");

vows.describe("Yeti JUnit Functional").addBatch({
    "A Yeti CLI with moduleless QUnit with JUnit output": {
        topic: cliTopic(function (topic) {
            var vow = this;

            topic.stderr.startCapture();

            portfinder.getPort(function (err, port) {
                if (err) {
                    vow.callback(err);
                    return;
                }

                port = String(port);
                topic.port = port;

                topic.stderr.expect("When ready", function () {
                    topic.stderr.stopCapture();
                    topic.output = topic.stderr.capturedData;
                    vow.callback(null, topic);
                });

                topic.fe.route([
                    "node",
                    "cli.js",
                    "--junit",
                    "-p", port,
                    __dirname + "/fixture/qunit.html"
                ]);
            });
        }),
        "is ok": function (topic) {
            assert.isUndefined(topic.stack);
        },
        "prints hub creation message on stderr": function (topic) {
            assert.ok(topic.output.indexOf("Creating a Hub.") === 0);
        },
        "waits for agents to connect on stderr": function (topic) {
            assert.include(topic.output, "Waiting for agents to connect");
        },
        "prompts on the writableStream": function (topic) {
            assert.include(topic.output, "When ready, press Enter");
        },
        "a browser": hub.phantomContext({
            "visits Yeti": {
                topic: function (browser, topic) {
                    var vow = this;

                    topic.browser = browser;

                    topic.stderr.expect("Agent connected", function (err, capturedData) {
                        topic.output = capturedData;
                        vow.callback(null, topic);
                    });

                    function onPageOpen(err, status) {
                        if (err) {
                            vow.callback(err);
                        }
                    }

                    browser.createPage(function (err, page) {
                        page.open("http://localhost:" + topic.port, onPageOpen);
                    });
                },
                "is ok": function (topic) {
                    assert.isUndefined(topic.stack);
                },
                "the stderr output contains the User-Agent": function (topic) {
                    assert.include(topic.output, "PhantomJS");
                },
                "when Enter is pressed": {
                    topic: function (topic) {
                        var vow = this;

                        topic.stderr.expect("pass", function (err, capturedData) {
                            topic.output = capturedData;
                            vow.callback(null, topic);
                        });

                        topic.stdout.startCapture();

                        topic.stdin.write("\n"); // Enter
                    },
                    "is ok": function (topic) {
                        assert.isUndefined(topic.stack);
                    },
                    "the stderr output contains the test summary": function (topic) {
                        // FIXME, tests should be test
                        assert.include(topic.output, "1 tests passed");
                    },
                    "the stderr output contains Agent complete": function (topic) {
                        assert.include(topic.output, "Agent complete");
                    },
                    "should exit": {
                        topic: function (topic) {
                            var vow = this;
                            topic.emitter.once("exit", function (code) {
                                topic.stdout.stopCapture();
                                topic.exitCode = code;
                                vow.callback(null, topic);
                            });
                        },
                        "with status code 0": function (topic) {
                            assert.strictEqual(topic.exitCode, 0);
                        },
                        "the stdout output contains JUnit XML": function (topic) {
                            assert.ok(topic.stdout.capturedData.indexOf("<?xml") === 0,
                                "Expected XML prolog in: " + topic.stdout.capturedData);
                            assert.include(topic.stdout.capturedData, "</testsuites>");
                        },
                        "the stdout output contains a JUnit testcase": function (topic) {
                            // https://github.com/yui/yeti/issues/78
                            assert.include(topic.stdout.capturedData, '<testcase name="hello qunit: test1"');
                        }
                    }
                }
            }
        }) // phantomContext
    }
}).export(module);
