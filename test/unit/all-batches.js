"use strict";

var vows = require("vows");
var assert = require("assert");
var mockery = require("mockery");
var util = require("util");

var EventEmitter2 = require("../../lib/event-emitter");

var createHubMock = require("../lib/mock-hub");

function MockBatch(options) {
    this.dispatched = false;
    this.launched = false;
    this.destroyed = false;
    this.batchSession = options.session;
}

MockBatch.prototype.pipeLog = function NOOP() {};

MockBatch.prototype.launchAndDispatch = function (cb) {
    cb(null);
    this.dispatched = true;
    this.launched = true;
};

MockBatch.prototype.dispatch = function () {
    this.dispatched = true;
};

MockBatch.prototype.destroy = function () {
    this.destroyed = true;
};

function MockBlizzardSession() {
    this.isMock = true;
    EventEmitter2.call(this);
}

util.inherits(MockBlizzardSession, EventEmitter2);

MockBlizzardSession.prototype.createNamespace = function () {
    return new EventEmitter2();
};

vows.describe("AllBatches").addBatch({
    "Given an AllBatches instance": {
        topic: function () {
            var AllBatches,
                topic = {},
                modulePath = "../../lib/hub/all-batches";
            topic.hub = createHubMock(topic);

            mockery.enable({
                useCleanCache: true
            });

            mockery.registerMock("./batch", MockBatch);

            AllBatches = require(modulePath);

            topic.allBatches = new AllBatches(topic.hub);
            return topic;
        },
        teardown: function () {
            mockery.deregisterAll();
            mockery.disable();
        },
        "the hub property is available": function (topic) {
            assert.ok(topic.allBatches.hub);
            assert.ok(topic.allBatches.hub.allAgents);
        },
        "when creating a batch that should launch browsers": {
            topic: function (topic) {
                var vow = this;
                topic.blizzardSession = new MockBlizzardSession();
                topic.spec = {
                    webdriver: {
                        host: "foo"
                    },
                    launchBrowsers: [{
                        browserName: "firefox"
                    }]
                };

                function wrappedCb(err) {
                    topic.newBatch = topic.allBatches.batches[Object.keys(topic.allBatches.batches)[0]];
                    vow.callback(err, topic);
                }

                topic.allBatches.createBatch(topic.blizzardSession, topic.spec, wrappedCb);
            },
            "is ok": function (topic) {
                if (topic instanceof Error) {
                    assert.fail(topic.stack);
                }
            },
            "the Batch had launchAndDispatch called": function (topic) {
                assert.isTrue(topic.newBatch.launched);
                assert.isTrue(topic.newBatch.dispatched);
            },
            "the Batch blizzardSession has an end listener": function (topic) {
                assert.lengthOf(topic.blizzardSession.listeners("end"), 1);
            },
            "when destroyed": {
                topic: function (topic) {
                    topic.allBatches.destroyBatch(topic.newBatch.id);
                    return topic;
                },
                "the Batch was destroyed": function (topic) {
                    assert.isUndefined(topic.newBatch);
                }
            }
        }
    }
}).export(module);
