"use strict";

var vows = require("vows");
var assert = require("assert");

var http = require("http");

var yeti = require("../lib/yeti");
var Hub = require("../lib/hub");

function request(path) {
    return function (hub, server) {
        var vow = this;
        http.get({
            host: "localhost",
            port: server.address().port,
            path: path
        }, function (res) {
            var data = "";
            res.setEncoding("utf8");
            res.on("data", function (chunk) {
                data = data + chunk;
            });
            res.on("error", vow.callback);
            res.on("end", function () {
                vow.callback(null, data);
            });
        });
    };
}

vows.describe("Yeti Listen").addBatch({
    "A HTTP server with a route": {
        topic: function () {
            var vow = this,
                server = http.createServer(function (req, res) {
                    res.writeHead(200, {
                        "Content-Type": "text/plain"
                    });
                    res.end("Dogcow!");
                });

            server.listen(function () {
                vow.callback(null, server);
            });
        },
        "is connected": function (topic) {
            assert.ok(topic.address().port);
        },
        "is hooked into a Yeti Hub": {
            topic: function (server) {
                var vow = this,
                    hub = new Hub();
                hub.attachServer(server, "/yeti");
                return hub;
            },
            "is connected": function (topic) {
                assert.ok(topic);
            },
            "when /yeti/public/inject.js is requested": {
                topic: request("/yeti/public/inject.js"),
                "the script is correct": function (topic) {
                    assert.ok(topic !== "Dogcow!");
                }
            },
            "when /foo is requested": {
                topic: request("/foo"),
                "the parent HTTP server response is correct": function (topic) {
                    assert.strictEqual(topic, "Dogcow!");
                }
            }
        }
    }
}).export(module);
