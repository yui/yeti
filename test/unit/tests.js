"use strict";

var vows = require("vows");
var assert = require("assert");

var Tests = require("../../lib/hub/tests");
var TestSpecification = require("../../lib/hub/test-specification");

vows.describe("Tests").addBatch({
    "Given Tests made from a TestSpecification": {
        topic: function () {
            var topic = {};
            topic.plans = {
                tests: [
                    "foo/bar.html",
                    "baz/quux.html"
                ],
                query: "coverage=1"
            };
            topic.spec = new TestSpecification(topic.plans);
            topic.tests = topic.spec.createTests();
            return topic;
        },
        "getByUrl for bar.html returns the bar.html Test": function (topic) {
            var test = topic.tests.getByUrl("foo/bar.html");
            assert.isFalse(test.isNull());
            assert.strictEqual(test.location, "foo/bar.html");
        },
        "getByUrl for a bogus test returns the NullTest": function (topic) {
            var test = topic.tests.getByUrl("lisa/bogus.html");
            assert.isTrue(test.isNull());
        },
        "getTestsWithoutResults gives us all tests": function (topic) {
            var tests = topic.tests.getTestsWithoutResults();
            assert.lengthOf(tests, topic.plans.tests.length);
            tests.forEach(function (test) {
                assert.isNull(test.results);
            });
        },
        "getPendingTests gives us all tests": function (topic) {
            var tests = topic.tests.getPendingTests();
            assert.lengthOf(tests, topic.plans.tests.length);
            tests.forEach(function (test) {
                assert.isFalse(test.isExecuting());
            });
        },
        "didComplete is false": function (topic) {
            assert.isFalse(topic.tests.didComplete());
        },
        "totalSubmitted is correct": function (topic) {
            assert.lengthOf(
                topic.plans.tests,
                topic.tests.totalSubmitted()
            );
        },
        "totalPending is correct": function (topic) {
            assert.lengthOf(
                topic.plans.tests,
                topic.tests.totalPending()
            );
        }
    }
}).export(module);
