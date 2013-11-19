"use strict";

var vows = require("vows");
var assert = require("assert");

var parseCaps = require("../../lib/cli/parse-caps");

vows.describe("Parse Browsers").addBatch({
    "Given undefined caps": {
        topic: function () {
            return parseCaps();
        },
        "an empty array is returned": function (caps) {
            assert.isArray(caps);
            assert.lengthOf(caps, 0);
        }
    },
    "Given an Appium iPhone iOS 7 cap": {
        topic: function () {
            return parseCaps(["platform=OS X 10.8;version=7;device-orientation=portrait;app=safari;device=iPhone Simulator"]);
        },
        "the browser is parsed correctly": function (caps) {
            var cap = caps.pop();
            assert.strictEqual(cap.browserName, "");
            assert.strictEqual(cap.platform, "OS X 10.8");
            assert.strictEqual(cap.version, "7");
            assert.strictEqual(cap["device-orientation"], "portrait");
            assert.strictEqual(cap.app, "safari");
            assert.strictEqual(cap.device, "iPhone Simulator");
            assert.include(cap.name, "Automated Browser");
        }
    },
    "Given an Appium iPad iOS 7 cap": {
        topic: function () {
            return parseCaps(["platform=OS X 10.8;version=7;device-orientation=portrait;app=safari;device=iPad Simulator"]);
        },
        "the browser is parsed correctly": function (caps) {
            var cap = caps.pop();
            assert.strictEqual(cap.browserName, "");
            assert.strictEqual(cap.platform, "OS X 10.8");
            assert.strictEqual(cap.version, "7");
            assert.strictEqual(cap["device-orientation"], "portrait");
            assert.strictEqual(cap.app, "safari");
            assert.strictEqual(cap.device, "iPad Simulator");
            assert.include(cap.name, "Automated Browser");
        }
    },
    "Given multiple caps": {
        topic: function () {
            return parseCaps([
                "platform=OS X 10.8;version=7;device-orientation=portrait;app=safari;device=iPad Simulator",
                "platform=OS X 10.8;version=7;device-orientation=portrait;app=safari;device=iPhone Simulator"
            ]);
        },
        "we get multiple caps": function (caps) {
            assert.lengthOf(caps, 2);
            caps.forEach(function (cap) {
                assert.strictEqual(cap.browserName, "");
                assert.strictEqual(cap.platform, "OS X 10.8");
                assert.strictEqual(cap.version, "7");
                assert.strictEqual(cap["device-orientation"], "portrait");
                assert.strictEqual(cap.app, "safari");
                assert.include(cap.name, "Automated Browser");
            });
        }
    },
}).export(module);
