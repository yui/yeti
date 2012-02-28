"use strict";

var vows = require("vows");
var assert = require("assert");

var blizzard = require("./lib/blizzard");

var BlizzardSession = require("../lib/blizzard/session");

var EventEmitter2 = require("eventemitter2").EventEmitter2;

vows.describe("Blizzard: Socket").addBatch(blizzard.sessionContext({
    "with a simple echo event": {
        topic: blizzard.rpcTopic({
            method: "echo",
            request: "foo"
        }, function (data, reply) {
            reply(null, data);
        }),
        "the response should be the same as the request": function (topic) {
            assert.strictEqual(topic.req, topic.res);
        }
    },
    "with an event that responds with binary data": {
        topic: blizzard.rpcTopic({
            method: "binary",
            request: "bar",
            fixture: new Buffer(7068)
        }, function (fixture, data, reply) {
            reply(null, fixture);
        }),
        "the response should be a Buffer": function (topic) {
            assert.ok(Buffer.isBuffer(topic.res));
        },
        "the response should be the correct length": function (topic) {
            assert.strictEqual(topic.res.length, topic.fixture.length);
        },
        "the response should be equal to the fixture": function (topic) {
            assert.deepEqual(topic.res, topic.fixture);
        }
    },
    "with events responded to from the incomingBridge API": {
        topic: function (lastTopic) {
            var vow = this,
                context = {},
                ee = new EventEmitter2();
            ee.once("bridge1", function (session, data, reply) {
                context.session = session;
                reply(null, data);
            });
            lastTopic.server.incomingBridge(ee, "bridge1");
            lastTopic.client.emit("rpc.bridge1", "quux", function (err, res) {
                vow.callback(err, {
                    context: context,
                    event: this.event,
                    res: res
                });
            });
        },
        "the response is correct": function (topic) {
            assert.strictEqual(topic.event, "rpc.bridge1");
            assert.strictEqual(topic.res, "quux");
        },
        "the BlizzardSession is the first argument to the bridge1 event": function (topic) {
            assert.ok(topic.context.session instanceof BlizzardSession);
        }
    }
})).export(module);
