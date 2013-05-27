"use strict";

var vows = require("vows");
var assert = require("assert");

var makeURLFromComponents = require("../../lib/hub/url-builder");

vows.describe("URL Builder").addBatch({
    "Given a mountpoint without a trailing slash and agentId": {
        topic: function () {
            return makeURLFromComponents("/emate", 300);
        },
        "the URL is correct": function (url) {
            assert.strictEqual(url, "/emate/agent/300");
        }
    },
    "Given a mountpoint with a trailing slash and agentId": {
        topic: function () {
            return makeURLFromComponents("/messagepad", 110);
        },
        "the URL is correct": function (url) {
            assert.strictEqual(url, "/messagepad/agent/110");
        }
    },
    "Given an empty string mountpoint, agentId, batchId, and test": {
        topic: function () {
            return makeURLFromComponents("/", 12, 24, "thirty-six.html");
        },
        "the URL is correct": function (url) {
            assert.strictEqual(url, "/agent/12/batch/24/test/thirty-six.html");
        }
    }
}).export(module);
