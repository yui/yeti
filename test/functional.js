"use strict";

var vows = require("vows");
var assert = require("assert");

var fs = require("graceful-fs");
var http = require("http");

var Hub = require("../lib/hub");

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

function visitorContext(createBatchConfiguration) {
    return {
        topic: function (browser, lastTopic) {
            var vow = this;
            browser.createPage(function (page) {
                var timeout = setTimeout(function () {
                    vow.callback(new Error("The capture page took too long to load."));
                }, 5000);
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

                if (process.env.RESOURCE_DEBUG) {
                    page.set("onResourceRequested", function () {
                        console.log.apply(this, [
                            "PhantomJS resource requested:"
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
                    batch = lastTopic.client.createBatch(createBatchConfiguration);

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
                                expectedPathname: lastTopic.pathname,
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
                assert.strictEqual(topic.finalPathname, topic.expectedPathname);
            },
            "the agentComplete event fired once": function (topic) {
                assert.strictEqual(topic.agentCompleteFires, 1);
            },
            "the agentSeen event fired for each test and for capture pages": function (topic) {
                // Capture page. + Test pages. + Return to capture page.
                // 1 + (Batch tests) + 1 = Expected fires.
                assert.strictEqual(topic.agentSeenFires, createBatchConfiguration.tests.length + 2);
            },
            "the agentResults are well-formed": function (topic) {
                assert.isArray(topic.agentResults);
                assert.strictEqual(topic.agentResults.length, createBatchConfiguration.tests.length);

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
    };
}

var DUMMY_PROTOCOL = "YetiDummyProtocol/1.0";

var SERVER_TEST_FIXTURE = fs.readFileSync(__dirname + "/fixture/attach-server.html");

function attachServerContext(testContext) {
    return {
        topic: function () {
            var vow = this,
                server = http.createServer(function (req, res) {
                    if (req.url === "/fixture") {
                        res.writeHead(200, {
                            "Content-Type": "text/html"
                        });
                        res.end(SERVER_TEST_FIXTURE);
                    } else {
                        res.writeHead(404, {
                            "Content-Type": "text/plain"
                        });
                        res.end("You failed.");
                    }
                });

            server.on("upgrade", function (req, socket, head) {
                if (req.headers.upgrade === DUMMY_PROTOCOL) {
                    socket.write([
                        "HTTP/1.1 101 Why not?",
                        "Upgrade: " + DUMMY_PROTOCOL,
                        "Connection: Upgrade",
                        "",
                        "dogcow"
                    ].join("\r\n"));
                }
            });

            server.listen(function () {
                vow.callback(null, server);
            });
        },
        "is connected": function (server) {
            assert.isNumber(server.address().port);
        },
        "attached to a Yeti Hub": {
            topic: function (server) {
                var vow = this,
                    hub = new Hub();
                hub.attachServer(server, "/yeti-test-route");
                return hub;
            },
            "is ok": function (hub) {
                assert.ok(hub.server);
            },
            "when sending a non-Yeti upgrade request": {
                topic: function (hub) {
                    var vow = this,
                        req = http.request({
                            port: hub.hubListener.server.address().port,
                            host: "localhost",
                            headers: {
                                "Connection": "Upgrade",
                                "Upgrade": DUMMY_PROTOCOL
                            }
                        });

                    req.end();

                    req.on("error", vow.callback);

                    req.on("upgrade", function (res, socket, head) {
                        socket.end();
                        vow.callback(null, {
                            res: res,
                            head: head
                        });
                    });
                },
                "the data is correct": function (topic) {
                    assert.strictEqual(topic.head.toString("utf8"), "dogcow");
                }
            },
            "used by the Hub Client": {
                // TODO: Handle without trailing slash.
                topic: hub.clientTopic("/yeti-test-route/"),
                "a browser for testing": {
                    topic: hub.phantomTopic(),
                    "visits Yeti": testContext
                }
            }
        }
    };
}

vows.describe("Yeti Functional")
    .addBatch(hub.functionalContext({
        "visits Yeti": visitorContext({
            basedir: __dirname + "/fixture",
            tests: ["basic.html", "local-js.html"]
        })
    }))
    .addBatch({
        "A HTTP server with an upgrade listener (for Yeti files)": attachServerContext(visitorContext({
            basedir: __dirname + "/fixture",
            tests: ["basic.html", "local-js.html"]
        })),
        "A HTTP server with an upgrade listener (for Yeti paths)": attachServerContext(visitorContext({
            tests: ["/fixture"],
            useProxy: false
        }))
    })
    .export(module);
