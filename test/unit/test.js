"use strict";

var vows = require("vows");
var assert = require("assert");

var Test = require("../../lib/hub/test");

vows.describe("Test").addBatch({
    "Given a Test with a querystring": {
        topic: function () {
            var topic = {};

            topic.location = "foo/bar/baz.html";
            topic.batchId = 1337;
            topic.mountpoint = "/yeti/";
            topic.query = "quuz=dogcow&new=1";

            topic.test = new Test(topic);

            return topic;
        },
        "it should not be executing yet": function (topic) {
            assert.isFalse(topic.test.isExecuting());
        },
        "there should be no results yet": function (topic) {
            assert.isNull(topic.test.results);
        },
        "it should not be the null Test": function (topic) {
            assert.isFalse(topic.test.isNull());
        },
        "calling getUrlForAgentId yields the correct URL": function (topic) {
            var agentId = 310;
            assert.strictEqual(
                topic.test.getUrlForAgentId(agentId),
                topic.mountpoint + [
                    "agent",
                    agentId,
                    "batch",
                    topic.batchId,
                    "test",
                    topic.location
                ].join("/") + "?" + topic.query
            );
        },
        "when results are requested": {
            topic: function (lastTopic) {
                var topic = {};
                topic.last = lastTopic;
                lastTopic.test.setResults(true);
                return topic;
            },
            "the results were set": function (topic) {
                assert.isTrue(topic.last.test.results);
            }
        },
        "when marked executing": {
            topic: function (lastTopic) {
                lastTopic.test.setExecuting(true);
                return lastTopic;
            },
            "the test is executing": function (topic) {
                assert.isTrue(topic.test.isExecuting());
            }
        }
    },
    "Given a Test without a querystring": {
        topic: function () {
            var topic = {};

            topic.location = "foo/bar/baz.html";
            topic.batchId = 1337;
            topic.mountpoint = "/yeti/";

            topic.test = new Test(topic);

            return topic;
        },
        "calling getUrlForAgentId yields the correct URL": function (topic) {
            var agentId = 319;
            assert.strictEqual(
                topic.test.getUrlForAgentId(agentId),
                topic.mountpoint + [
                    "agent",
                    agentId,
                    "batch",
                    topic.batchId,
                    "test",
                    topic.location
                ].join("/")
            );
        }
    }
}).export(module);

