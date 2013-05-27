"use strict";

var vows = require("vows");
var assert = require("assert");

var LiteralTest = require("../../lib/hub/literal-test");

vows.describe("LiteralTest").addBatch({
    "Given a LiteralTest": {
        topic: function () {
            return new LiteralTest({
                location: "/profile/settings"
            });
        },
        "the URL should exactly match the location": function (test) {
            assert.strictEqual(
                test.getUrlForAgentId(351),
                "/profile/settings"
            );
        }
    }
}).export(module);
