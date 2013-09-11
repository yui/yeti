"use strict";

var vows = require("vows");
var assert = require("assert");

var parseBrowsers = require("../../lib/cli/parse-browsers");

vows.describe("Parse Browsers").addBatch({
    "Given ie/windows 7": {
        topic: function () {
            return parseBrowsers(["ie/windows 7"]);
        },
        "the browser is parsed correctly": function (caps) {
            var cap = caps.pop();
            assert.strictEqual(cap.browserName, "internet explorer");
            assert.strictEqual(cap.platform, "WINDOWS 7");
            assert.include(cap.name, "Automated Browser");
        }
    },
    "Given ie/windows/8": {
        topic: function () {
            return parseBrowsers(["ie/windows/8"]);
        },
        "the browser is parsed correctly": function (caps) {
            var cap = caps.pop();
            assert.strictEqual(cap.browserName, "internet explorer");
            assert.strictEqual(cap.platform, "WINDOWS");
            assert.strictEqual(cap.version, "8");
            assert.include(cap.name, "Automated Browser");
        }
    },
    "Given chrome/mac": {
        topic: function () {
            return parseBrowsers(["chrome/mac"]);
        },
        "the browser is parsed correctly": function (caps) {
            var cap = caps.pop();
            assert.strictEqual(cap.browserName, "chrome");
            assert.strictEqual(cap.platform, "MAC");
            assert.isUndefined(cap.version);
            assert.include(cap.name, "Automated Browser");
        }
    },
    "Given safari/os x the browser is ambigious": function () {
        assert.throws(function () {
            parseBrowsers(["safari/os x"]);
        });
    }
}).export(module);
