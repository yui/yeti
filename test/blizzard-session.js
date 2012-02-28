"use strict";

var vows = require("vows");
var assert = require("assert");

var net = require("net");
var BlizzardSession = require("../lib/blizzard/session");

vows.describe("Blizzard: Socket").addBatch({
    "A net socket": {
        topic: function () {
            var vow = this,
                server = net.createServer();

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
        "used by Blizzard": {
            topic: function (lastTopic) {
                var vow = this,
                    server = lastTopic.server,
                    clientSession,
                    clientSocket = net.connect(lastTopic.port, function () {
                        clientSession = new BlizzardSession(clientSocket, true);
                        clientSocket.removeListener("error", vow.callback);
                    });

                server.on("connection", function onServerConnection(clientSocket) {
                    var serverSession = new BlizzardSession(clientSocket, false);
                    serverSession.once("ready", function () {
                        // The handshake completed.
                        server.removeListener("connection", onServerConnection);
                        vow.callback(null, {
                            client: clientSession,
                            server: serverSession
                        });
                    });
                });

                clientSocket.once("error", vow.callback);
            },
            "is ok": function (topic) {
                assert.ok(topic.client);
                assert.ok(topic.server);
            },
            "with a simple echo event": {
                topic: function (lastTopic) {
                    var fixture = "foo";
                    lastTopic.server.on("request.echo", function (data, reply) {
                        reply(null, data);
                    });
                    lastTopic.client.emit("rpc.echo", fixture, this.callback);
                },
                "the response should be the same as the request": function (data) {
                    assert.strictEqual("foo", data);
                }
            }
        }
    }
}).export(module);
