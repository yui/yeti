"use strict";

var assert = require("assert");
var http = require("http");
var phantom = require("phantom");

var Hub = require("../../lib/hub");
var hubClient = require("../../lib/client");

var clientContext = exports.clientContext = function (subContext) {
    var context = {
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
        }
    };

    // Mixin the provided context.
    Object.keys(subContext).forEach(function (key) {
        context[key] = subContext[key];
    });

    return {
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
            "used by the Hub Client": context
        }
    };
};

exports.functionalContext = function (subContext) {
    var browserContext = {
        topic: function (lastTopic) {
            var vow = this,
                start = new Date(),
                timeout = setTimeout(function () {
                    vow.callback(new Error("Unable to start phantomjs."));
                    process.exit(1);
                }, 10000);
            phantom.create(function (browser) {
                clearInterval(timeout);
                vow.callback(null, browser);
            });
        },
        "is ok": function (browser) {
            assert.isFunction(browser.createPage);
        }
    };

    // Mixin the provided context.
    Object.keys(subContext).forEach(function (key) {
        browserContext[key] = subContext[key];
    });

    return clientContext({
        "a browser": browserContext
    });
};


