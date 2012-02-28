"use strict";

var vows = require("vows");
var assert = require("assert");

var blizzard = require("./lib/blizzard");

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
    }
})).export(module);
