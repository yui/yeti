"use strict";

var vows = require("vows");
var assert = require("assert");

var hub = require("./lib/hub");

if (process.env.TRAVIS) {
    // Debug test errors that only occur on Travis CI.
    var _exit = process.exit;
    process.exit = function (code) {
        var e = new Error();
        console.warn("TRAVIS: process.exit was called! Code:", code, "Stack:", e.stack);
        return _exit(code);
    };
}

var context = {
    "visits Yeti": {
        topic: function (browser, lastTopic) {
            var vow = this;
            browser.createPage(function (page) {
                var timeout = setTimeout(function () {
                    vow.callback(new Error("Timed out."));
                }, 500);

                lastTopic.client.once("agentConnect", function (agent) {
                    clearTimeout(timeout);
                    vow.callback(null, {
                        page: page,
                        agent: agent
                    });
                });

                if (process.env.TRAVIS) {
                    page.set("onConsoleMessage", function () {
                        console.log.apply(this, [
                            "PhantomJS console message:"
                        ].concat(Array.prototype.slice.apply(arguments)));
                    });
                }

                page.open(lastTopic.url, function (status) {
                    if (status !== "success") {
                        vow.callback(new Error("Failed to load page."));
                    }
                });
            });
        },
        "is ok": function (pageTopic) {
            assert.ok(pageTopic.page);
        },
        "which fires agentConnect with the agent details": function (pageTopic) {
            assert.isString(pageTopic.agent);
        },
        "for a batch": {
            topic: function (pageTopic, browser, lastTopic) {
                var vow = this,
                    results = [],
                    agentCompleteFires = 0,
                    agentSeenFires = 0,
                    timeout = setTimeout(function () {
                        vow.callback(new Error("Batch dispatch failed."));
                        process.exit(1);
                    }, 20000),
                    batch = lastTopic.client.createBatch({
                        basedir: __dirname + "/fixture",
                        tests: ["basic.html"]
                    });

                batch.on("agentResult", function (agent, details) {
                    results.push(details);
                });

                batch.on("agentScriptError", function (agent, details) {
                    vow.callback(new Error("Unexpected script error: " + details.message));
                });

                lastTopic.client.on("agentSeen", function (agent) {
                    agentSeenFires = agentSeenFires + 1;
                });

                batch.on("agentComplete", function (agent) {
                    agentCompleteFires = agentCompleteFires + 1;
                });

                batch.on("complete", function () {
                    lastTopic.client.once("agentSeen", function (agent) {
                        clearTimeout(timeout);
                        pageTopic.page.evaluate(function () {
                            return window.location.pathname;
                        }, function (pathname) {
                            pageTopic.page.release();
                            vow.callback(null, {
                                finalPathname: pathname,
                                agentResults: results,
                                agentSeenFires: agentSeenFires,
                                agentCompleteFires: agentCompleteFires
                            });
                        });
                    });
                });
            },
            "the browser returned to the capture page": function (topic) {
                assert.strictEqual(topic.finalPathname, "/");
            },
            "the agentComplete event fired once": function (topic) {
                assert.strictEqual(topic.agentCompleteFires, 1);
            },
            "the agentSeen event fired 3 times": function (topic) {
                // 1. Capture page.
                // 2. Test page.
                // 3. Return to capture page.
                assert.strictEqual(topic.agentSeenFires, 3);
            },
            "the agentResults are well-formed": function (topic) {
                assert.isArray(topic.agentResults);
                assert.strictEqual(topic.agentResults.length, 1);

                var result = topic.agentResults[0];

                assert.include(result, "passed");
                assert.include(result, "failed");
                assert.include(result, "total");
                assert.include(result, "ignored");
                assert.include(result, "duration");
                assert.include(result, "name");
                assert.include(result, "timestamp");
            }
        }
        /* TODO agentDisconnect is not yet implemented.
        "visits Yeti briefly for the agentDisconnect event": {
            topic: function (browser, lastTopic) {
                var vow = this;
                browser.createPage(function (page) {
                    var timeout = setTimeout(function () {
                        vow.callback(new Error("Timed out."));
                    }, 500);

                    lastTopic.client.once("agentDisconnect", function (agent) {
                        clearTimeout(timeout);
                        vow.callback(null, agent);
                    });

                    page.open(lastTopic.url, function (status) {
                        if (status !== "success") {
                            vow.callback(new Error("Failed to load page."));
                        }
                        lastTopic.client.once("agentConnect", function (agent) {
                            page.release();
                        });
                    });
                });
            },
            "which fires with the agent details": function (agent) {
                assert.isString(agent);
            }
        } */
    }
};

vows.describe("Yeti Functional").addBatch(hub.functionalContext(context)).export(module);
