"use strict";

var vows = require("vows");
var assert = require("assert");
var phantom = require("phantom");

var Hub = require("../lib/hub");
var hubClient = require("../lib/client");

vows.describe("Yeti Client").addBatch({
    "A Yeti Hub": {
        topic: function () {
            var vow = this,
                hub = new Hub();
            hub.listen(function () {
                hub.removeListener("error", vow.callback);

                // We did not define a port, the OS provided one.
                // Pass this along to the next test context.
                vow.callback(null, {
                    port: hub.server.address().port,
                    hub: hub
                });
            });
            hub.once("error", vow.callback);
        },
        "is ok": function (topic) {
            assert.ok(topic.hub);
            assert.isNumber(topic.port);
        },
        "used by the Hub Client": {
            topic: function (lastTopic) {
                var vow = this,
                    url = "http://localhost:" + lastTopic.port,
                    client = hubClient.createClient(url);
                client.connect(function (err) {
                    vow.callback(err, {
                        client: client,
                        url: url
                    });
                });
            },
            "is ok": function (topic) {
                assert.ok(topic.client);
            },
            "a browser": {
                topic: function (lastTopic) {
                    var vow = this,
                        start = new Date(),
                        timeout = setTimeout(function () {
                            vow.callback(new Error("Unable to start phantomjs."));
                            process.exit(1);
                        }, 2000);
                    phantom.create(function (browser) {
                        clearInterval(timeout);
                        vow.callback(null, browser);
                    });
                },
                "is ok": function (browser) {
                    assert.isFunction(browser.createPage);
                },
                "visits Yeti briefly for the agentConnect event": {
                    topic: function (browser, lastTopic) {
                        var vow = this;
                        browser.createPage(function (page) {
                            var timeout = setTimeout(function () {
                                vow.callback(new Error("Timed out."));
                            }, 500);

                            lastTopic.client.once("agentConnect", function (session, agent) {
                                clearTimeout(timeout);
                                page.release();
                                vow.callback(null, agent);
                            });

                            page.open(lastTopic.url, function (status) {
                                if (status !== "success") {
                                    vow.callback(new Error("Failed to load page."));
                                }
                            });
                        });
                    },
                    "which fires with the agent details": function (agent) {
                        assert.isString(agent);
                    }
                },
                /* TODO agentDisconnect is not yet implemented.
                "visits Yeti briefly for the agentDisconnect event": {
                    topic: function (browser, lastTopic) {
                        var vow = this;
                        browser.createPage(function (page) {
                            var timeout = setTimeout(function () {
                                vow.callback(new Error("Timed out."));
                            }, 500);

                            lastTopic.client.once("agentDisconnect", function (session, agent) {
                                clearTimeout(timeout);
                                vow.callback(null, agent);
                            });

                            page.open(lastTopic.url, function (status) {
                                if (status !== "success") {
                                    vow.callback(new Error("Failed to load page."));
                                }
                                lastTopic.client.once("agentConnect", function (session, agent) {
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
        }
    }
}).export(module);
