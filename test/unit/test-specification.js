"use strict";

var vows = require("vows");
var assert = require("assert");

var TestSpecification = require("../../lib/hub/test-specification");

vows.describe("TestSpecification").addBatch({
    "Given an empty TestSpecification": {
        topic: function () {
            return TestSpecification.empty();
        },
        "the mountpoint is set correctly": function (spec) {
            assert.strictEqual(spec.mountpoint, "/");
        },
        "the timeout is set correctly": function (spec) {
            assert.strictEqual(spec.getTimeoutMilliseconds(), 300000); // 5 minutes
        },
        "creating Tests": {
            topic: function (spec) {
                return spec.createTests();
            },
            "that should be the NullTest": function (tests) {
                assert.isTrue(tests.next().isNull());
                assert.isTrue(tests.next().isNull());
            }
        }
    },
    "Given a TestSpecification with a mountpoint that is the empty string": {
        topic: function () {
            return new TestSpecification({
                mountpoint: ""
            });
        },
        "the mountpoint is set correctly": function (spec) {
            assert.strictEqual(spec.mountpoint, "/");
        }
    },
    "Given a TestSpecification with a mountpoint without a trailing slash": {
        topic: function () {
            return new TestSpecification({
                mountpoint: "/dogcow"
            });
        },
        "the mountpoint is set correctly": function (spec) {
            assert.strictEqual(spec.mountpoint, "/dogcow/");
        }
    },
    "Given a TestSpecification with a mountpoint with a trailing slash": {
        topic: function () {
            return new TestSpecification({
                mountpoint: "/claris/"
            });
        },
        "the mountpoint is set correctly": function (spec) {
            assert.strictEqual(spec.mountpoint, "/claris/");
        }
    }
}).export(module);
