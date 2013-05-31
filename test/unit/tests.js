"use strict";

var vows = require("vows");
var assert = require("assert");

var Tests = require("../../lib/hub/tests");
var LiteralTest = require("../../lib/hub/literal-test");
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
        },
        "each Test is a LiteralTest": function (topic) {
            // Because useProxy was undefined (falsy)
            topic.tests.getTestsWithoutResults().forEach(function (test) {
                assert.instanceOf(test, LiteralTest);
            });
        },
        "when assigned results": {
            topic: function (topic) {
                topic.next = topic.tests.next();
                topic.next.results = {
                    pass: 1
                };
                return topic;
            },
            "totalPending is correct": function (topic) {
                assert.strictEqual(
                    topic.plans.tests.length - 1,
                    topic.tests.totalPending()
                );
            },
            "getByUrl works for the first test": function (topic) {
                var test = topic.tests.getByUrl(topic.plans.tests[0]);
                assert.ok(test.results);
                assert.ok(test.results.pass);
            },
            "when all results are in": {
                topic: function (topic) {
                    var next;
                    topic.testsRemaining = topic.plans.tests.length - 1;
                    while (!topic.tests.didComplete()) {
                        next = topic.tests.next();
                        next.results = topic.next.results;
                        topic.testsRemaining -= 1;
                    }
                    return topic;
                },
                "no tests remain": function (topic) {
                    assert.strictEqual(topic.testsRemaining, 0);
                },
                "calling next yields the NullTest": function (topic) {
                    assert.isTrue(topic.tests.next().isNull());
                },
                "totalPending is zero": function (topic) {
                    assert.strictEqual(topic.tests.totalPending(), 0);
                },
                "didComplete is true": function (topic) {
                    assert.isTrue(topic.tests.didComplete());
                }
            }
        }
    },
    "Given Tests made from a TestSpecification with useProxy set to true": {
        topic: function () {
            var topic = {};
            topic.plans = {
                tests: [
                    "foo/bar.html",
                    "baz/quux.html"
                ],
                // No trailing slash. Will be fixed during construction.
                mountpoint: "/laserwriter",
                query: "coverage=1",
                useProxy: true
            };
            topic.spec = new TestSpecification(topic.plans);
            topic.tests = topic.spec.createTests();
            return topic;
        },
        "each Test is not a LiteralTest": function (topic) {
            topic.tests.getTestsWithoutResults().forEach(function (test) {
                assert.ok(!(test instanceof LiteralTest));
            });
        },
        "each Test has the correct query": function (topic) {
            topic.tests.getTestsWithoutResults().forEach(function (test) {
                assert.strictEqual(test.query, topic.plans.query);
            });
        },
        "each Test has the correct mountpoint": function (topic) {
            topic.tests.getTestsWithoutResults().forEach(function (test) {
                // Note: Our plan didn't include a trailing slash, but
                // we expect one to be added during construction. Test for that.
                assert.strictEqual(test.mountpoint, topic.plans.mountpoint + "/");
            });
        }
    }
}).export(module);
