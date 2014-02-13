"use strict";

var vows = require("vows");
var assert = require("assert");

var FileMatcher = require("../../lib/file-matcher");

vows.describe("FileMatcher").addBatch({
    "Given a FileMatcher that matches JS": {
        topic: function () {
            return new FileMatcher({
                extension: "js"
            });
        },
        "when given a CSS file": {
            topic: function (fm) {
                return fm.match("foo.css");
            },
            "there is not a match": function (topic) {
                assert.isFalse(topic);
            }
        },
        "when given a JS file": {
            topic: function (fm) {
                return fm.match("foo.js");
            },
            "there is a match": function (topic) {
                assert.isTrue(topic);
            }
        }
    },
    "Given a FileMatcher that matches JS and excludes node_modules, vendor, **/*.cov.js": {
        topic: function () {
            return new FileMatcher({
                extension: "js",
                excludes: [
                    "**/*.cov.js",
                    "**/vendor/**",
                    "node_modules/**"
                ]
            });
        },
        "when given a CSS file": {
            topic: function (fm) {
                return fm.match("jasper.css");
            },
            "there is not a match": function (topic) {
                assert.isFalse(topic);
            }
        },
        "when given a JS file": {
            topic: function (fm) {
                return fm.match("jasper.js");
            },
            "there is a match": function (topic) {
                assert.isTrue(topic);
            }
        },
        "when given a JS file ending with cov.js": {
            topic: function (fm) {
                return fm.match("bar/jasper.cov.js");
            },
            "there is not a match": function (topic) {
                assert.isFalse(topic);
            }
        },
        "when given a JS file in a vendor directory": {
            topic: function (fm) {
                return fm.match("bar/vendor/jasmine-foo.js");
            },
            "there is not a match": function (topic) {
                assert.isFalse(topic);
            }
        },
        "when given a JS file with node_modules/ in the path": {
            topic: function (fm) {
                return fm.match("node_modules/mocha/jasmine-foo.js");
            },
            "there is not a match": function (topic) {
                assert.isFalse(topic);
            }
        }
    },
}).export(module);
