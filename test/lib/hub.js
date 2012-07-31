"use strict";

var assert = require("assert");
var http = require("http");
var phantom = require("phantom");

var Hub = require("../../lib/hub");
var hubClient = require("../../lib/client");

var clientTopic = exports.clientTopic = function (pathname) {
    if (!pathname) {
        pathname = "/";
    }
    return function (hub) {
        var vow = this,
            server = (hub.hubListener && hub.hubListener.server) || hub.server,
            url = "http://localhost:" + server.address().port + pathname,
            client = hubClient.createClient(url);
        hub.on("newClientSession", function (session) {
            vow.callback(null, {
                session: session,
                pathname: pathname || "/",
                client: client,
                url: url
            });
        });
        client.connect(function (err) {
            if (err) {
                vow.callback(err);
            }
        });
    };
};

var clientContext = exports.clientContext = function (subContext) {
    var context = {
        topic: clientTopic(),
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
                    vow.callback(null, hub);
                });
                hub.once("error", vow.callback);
            },
            teardown: function (hub) {
                hub.close();
            },
            "is ok": function (hub) {
                assert.ok(hub);
                assert.isNumber(hub.server.address().port);
            },
            "used by the Hub Client": context
        }
    };
};

var phantomTopic = exports.phantomTopic = function () {
    return function (lastTopic) {
        var vow = this,
            start = new Date(),
            timeout = setTimeout(function () {
                vow.callback(new Error("Unable to start phantomjs."));
                process.exit(1);
            }, 10000);
        phantom.create(function (browser) {
            clearTimeout(timeout);
            vow.callback(null, browser);
        });
    };
};

exports.functionalContext = function (subContext) {
    var browserContext = {
        topic: phantomTopic(),
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
