"use strict";

var vows = require("vows");
var assert = require("assert");
var mockery = require("mockery");
var util = require("util");

var EventEmitter2 = require("../../lib/event-emitter");

var Target = require("../../lib/hub/target");

function MockBatch() {
    this.whitelist = [];
    this.allBatches = {
        hub: {
            mountpoint: "/"
        }
    };
}

MockBatch.prototype.getAgentWhitelist = function () {
    return this.whitelist;
};

function MockAgent(ua) {
    this.target = null;
    this.ua = ua;
    this.id = Math.random() * 100000 | 0;
    EventEmitter2.call(this);
}

util.inherits(MockAgent, EventEmitter2);

MockAgent.prototype.pipeLog = function NOOP() {};

MockAgent.prototype.setTarget = function (target) {
    this.target = target;
};

vows.describe("Target").addBatch({
    "A Target instance": {
        topic: function () {
            var topic = {};
            topic.mockBatch = new MockBatch();
            topic.ua = "LunaSuite/1.0 Newton/2.1";
            topic.target = new Target(topic.mockBatch, topic.ua);
            return topic;
        },
        "is ok": function (topic) {
            if (topic instanceof Error) {
                assert.fail(topic.stack);
            }
        },
        "will disallow browsers of a different type": function (topic) {
            var browser = new MockAgent("Lynx/1.0");
            assert.isFalse(topic.target.isAgentAllowed(browser));
        },
        "will accept browsers of the same type": function (topic) {
            var browser = new MockAgent(topic.ua);
            assert.isTrue(topic.target.isAgentAllowed(browser));
        },
        "will append new browser of the same type": function (topic) {
            var browser = new MockAgent(topic.ua);
            assert.isTrue(topic.target.appendAgentIfAllowed(browser));
            assert.include(topic.target.agents, browser.id);
            assert.strictEqual(browser.target, topic.target);
        },
        "will append many browsers but only of the same type": function (topic) {
            var browsers = [
                    new MockAgent(topic.ua),
                    new MockAgent(topic.ua),
                    new MockAgent("Moasic/2.1")
                ];
            topic.target.appendAgents(browsers);
            assert.include(topic.target.agents, browsers[0].id);
            assert.include(topic.target.agents, browsers[1].id);
            assert.isFalse(browsers[2].id in topic.target.agents);
        }
    }
}).export(module);
