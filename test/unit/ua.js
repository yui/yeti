"use strict";

var vows = require("vows");
var assert = require("assert");

var parseUA = require("../../lib/hub/ua");

vows.describe("Parse UA").addBatch({
    "Given IE 11 from Sauce Labs": {
        topic: function () {
            return parseUA("Mozilla/5.0 (Windows NT 6.3; WOW64; Trident/7.0; .NET4.0E; .NET4.0C; rv:11.0) like Gecko");
        },
        "the browser is parsed correctly": function (topic) {
            assert.strictEqual(topic, "Internet Explorer (11.0) / Windows 8.1");
        }
    }
}).export(module);
