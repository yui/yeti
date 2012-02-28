"use strict";

var assert = require("assert");
var http = require("http");

var Blizzard = require("../../lib/blizzard");

exports.sessionContext = function (subContext) {
    var blizzardContext = {
        topic: function (lastTopic) {
            var vow = this,
                server = lastTopic.server,
                serverBlizzard = new Blizzard(),
                clientBlizzard = new Blizzard(),
                clientBlizzardSession;

            serverBlizzard.listen(server);

            clientBlizzard.connect("http://127.0.0.1:" + lastTopic.port, function (err, newSession) {
                clientBlizzardSession = newSession;
            });

            serverBlizzard.once("session", function onSession(serverBlizzardSession) {
                // The handshake completed.
                serverBlizzard.removeListener("session", onSession);
                vow.callback(null, {
                    client: clientBlizzardSession,
                    server: serverBlizzardSession
                });
            });

        }
    };

    blizzardContext["is ok"] = function (topic) {
        assert.ok(topic.client);
        assert.ok(topic.server);
    };

    // Mixin the provided context.
    Object.keys(subContext).forEach(function (key) {
        blizzardContext[key] = subContext[key];
    });

    return {
        "A HTTP server": {
            topic: function () {
                var vow = this,
                    server = http.createServer();

                server.listen(function () {
                    // We did not define a port, the OS provided one.
                    // Pass this along to the next test context.
                    vow.callback(null, {
                        port: server.address().port,
                        server: server
                    });
                });
            },
            "is connected": function (topic) {
                assert.ok(topic.port);
            },
            "used by Blizzard": blizzardContext
        }
    };
};
