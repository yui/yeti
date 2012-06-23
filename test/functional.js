"use strict";

var vows = require("vows");
var assert = require("assert");

var path = require("path");
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

function didNotThrow(topic) {
    if (topic instanceof Error) {
        assert.fail(topic, {}, "Topic error: " + topic.stack);
    }
}

function getUrl() {
    /*global window:true */
    // This function runs in the scope of the web page.
    return window.location.pathname;
}

function captureContext(batchContext) {
    return {
        topic: function (browser, lastTopic) {
            var vow = this;
            browser.createPage(function (page) {
                var timeout = setTimeout(function () {
                    vow.callback(new Error("The capture page took too long to load."));
                }, 5000);

                lastTopic.client.once("agentConnect", function (agent) {
                    lastTopic.client.once("agentSeen", function () {
                        page.evaluate(getUrl, function (url) {
                            clearTimeout(timeout);
                            vow.callback(null, {
                                url: url,
                                page: page,
                                agent: agent
                            });
                        });
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
        "did not throw": didNotThrow,
        "is ok": function (pageTopic) {
            assert.ok(pageTopic.page);
        },
        "which fires agentConnect with the agent details": function (pageTopic) {
            assert.isString(pageTopic.agent);
        },
        "when querying for connected agents": {
            topic: function (pageTopic, browserTopic, yetiTopic) {
                var vow = this;
                yetiTopic.client.getAgents(function (err, agents) {
                    vow.callback(err, {
                        getAgentsResult: agents,
                        agentName: pageTopic.agent
                    });
                });
            },
            "the result is an array": function (topic) {
                assert.isArray(topic.getAgentsResult);
            },
            "this agent is in the list": function (topic) {
                assert.strictEqual(topic.getAgentsResult[0], topic.agentName);
            }
        },
        "for a batch": batchContext
    };
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

function createBatchTopic(createBatchConfiguration) {
    return function (pageTopic, browser, lastTopic) {
        var vow = this,
            results = [],
            agentCompleteFires = 0,
            agentErrorFires = 0,
            agentSeenFires = 0,
            agentBeatFires = 0,
            timeout = setTimeout(function () {
                vow.callback(new Error("Batch dispatch failed for " + lastTopic.url));
                process.exit(1);
            }, 20000),
            batch = lastTopic.client.createBatch(createBatchConfiguration);

        batch.on("agentResult", function (agent, details) {
            results.push(details);
        });

        batch.on("agentScriptError", function (agent, details) {
            vow.callback(new Error("Unexpected script error: " + details.message));
        });

        batch.on("agentError", function (agent, details) {
            agentErrorFires = agentErrorFires + 1;
        });

        batch.on("agentBeat", function (agent, details) {
            agentBeatFires = agentBeatFires + 1;
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
                pageTopic.page.evaluate(getUrl, function (pathname) {
                    pageTopic.page.release();
                    vow.callback(null, {
                        expectedPathname: pageTopic.url,
                        finalPathname: pathname,
                        agentResults: results,
                        agentBeats: agentBeatFires,
                        agentSeenFires: agentSeenFires,
                        agentErrorFires: agentErrorFires,
                        agentCompleteFires: agentCompleteFires
                    });
                });
            });
        });
    };
}

function visitorContext(createBatchConfiguration) {
    return captureContext({
        topic: createBatchTopic(createBatchConfiguration),
        "did not throw": didNotThrow,
        "the browser returned to the capture page": function (topic) {
            assert.strictEqual(topic.finalPathname, topic.expectedPathname);
        },
        "the agentComplete event fired once": function (topic) {
            assert.strictEqual(topic.agentCompleteFires, 1);
        },
        "the agentSeen event fired for each test and for capture pages": function (topic) {
            // Test pages. + Return to capture page.
            // (Batch tests) + 1 = Expected fires.
            assert.strictEqual(topic.agentSeenFires, createBatchConfiguration.tests.length + 1);
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
        },
        "the agentBeat event fired for each beat received": function (topic) {
            // Beats are subjective, they are a ping and not really trackable
            // since they may be throttled they may not match up to the actual
            // number of tests being executed, so we just need to make sure
            // a ping actually happened.
            assert.ok(topic.agentBeats);
            //There should be at least one beat per test executed, maybe more
            assert.ok(topic.agentBeats >= createBatchConfiguration.tests.length);
        }
    });
}

function errorContext(createBatchConfiguration) {
    return captureContext({
        topic: createBatchTopic(createBatchConfiguration),
        "did not throw": didNotThrow,
        "the browser returned to the capture page": function (topic) {
            assert.strictEqual(topic.finalPathname, topic.expectedPathname);
        },
        "the agentComplete event fired once": function (topic) {
            assert.strictEqual(topic.agentCompleteFires, 1);
        },
        "the agentError event fired for all tests": function (topic) {
            assert.strictEqual(topic.agentCompleteFires, createBatchConfiguration.tests.length);
        },
        "the agentSeen event fired for capture pages": function (topic) {
            // (Nothing; all tests invalid) + Return to capture page.
            // 1 = Expected fires.
            assert.strictEqual(topic.agentSeenFires, 1);
        },
        "the agentResults is an empty array": function (topic) {
            assert.isArray(topic.agentResults);
            assert.strictEqual(topic.agentResults.length, 0);
        }
    });
}

var DUMMY_PROTOCOL = "YetiDummyProtocol/1.0";

var SERVER_TEST_FIXTURE = fs.readFileSync(path.join(__dirname, "fixture/attach-server.html"), "utf8");
var YUI_TEST_FIXTURE = fs.readFileSync(path.resolve(__dirname, "../dep/yui-test.js"), "utf8");

function attachServerContext(testContext, explicitRoute) {
    var route, testFixture;

    if (explicitRoute) {
        route = explicitRoute;
    } else {
        route = "/yeti";
    }

    testFixture = SERVER_TEST_FIXTURE.replace(/\{route\}/g, route);

    return {
        topic: function () {
            var vow = this,
                server = http.createServer(function (req, res) {
                    if (req.url === "/fixture") {
                        res.writeHead(200, {
                            "Content-Type": "text/html"
                        });
                        res.end(testFixture);
                    } else if (req.url === "/yui") {
                        res.writeHead(200, {
                            "Content-Type": "application/javascript"
                        });
                        res.end(YUI_TEST_FIXTURE);
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
        teardown: function (server) {
            server.close();
        },
        "did not throw": didNotThrow,
        "is connected": function (server) {
            assert.isNumber(server.address().port);
        },
        "attached to a Yeti Hub": {
            topic: function (server) {
                var vow = this,
                    hub = new Hub();

                if (!explicitRoute) {
                    hub.attachServer(server);
                } else {
                    hub.attachServer(server, route);
                }

                return hub;
            },
            "did not throw": didNotThrow,
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
                topic: hub.clientTopic(route + "/"),
                teardown: function (topic) {
                    topic.client.end();
                },
                "a browser for testing": {
                    topic: hub.phantomTopic(),
                    "visits Yeti": testContext
                }
            }
        }
    };
}

function attachServerBatch(definition) {
    var batch = {},
        routeWords = ["foo", "bar", "baz", "quux"];

    Object.keys(definition).forEach(function (name) {
        var options = definition[name],
            route = "/" + routeWords.sort(function () {
                return 1 - Math.random() * 2;
            }).join("-");

        batch[name] = attachServerContext(visitorContext(options));
        batch[name + " with a custom route"] = attachServerContext(visitorContext(options), route);
    });

    return batch;
}

var basedir = path.join(__dirname, "..");

function fixtures(basenames) {
    return basenames.map(function (basename) {
        return path.join(__dirname, "fixture", basename);
    });
}

function withTests() {
    return {
        basedir: basedir,
        tests: fixtures(Array.prototype.slice.call(arguments))
    };
}

vows.describe("Yeti Functional")
    .addBatch(hub.functionalContext({
        "visits Yeti": visitorContext(withTests("basic.html", "local-js.html", "404-script.html"))
    }))
    .addBatch(hub.functionalContext({
        "visits Yeti with invalid files": errorContext(withTests("this-file-does-not-exist.html"))
    }))
    .addBatch(attachServerBatch({
        "A HTTP server with an upgrade listener (for Yeti files)": withTests("basic.html", "local-js.html"),
        "A HTTP server with an upgrade listener (for Yeti paths)": {
            tests: ["/fixture"],
            useProxy: false
        }
    }))
    .export(module);
