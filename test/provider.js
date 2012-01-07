"use strict";

var assert = require("assert");
var vows = require("vows");
var fs = require("graceful-fs");
var pact = require("pact");

var Provider = require("../lib/provider");

vows.describe("Provider").addBatch({
    "A new Provider server": {
        topic: function () {
            var p = new Provider({
                basedir: __dirname + "/fixture"
            });
            pact.httpify(p.createServer()).apply(this);
        },
        "when / is requested": {
            topic: pact.request(),
            "should 404": pact.code(404)
        },
        "when /public/test.html is requested": {
            topic: pact.request(),
            "should succeed": pact.code(200),
            "contains expected content": function (topic) {
                var expected = fs.readFileSync(
                    __dirname + "/fixture/expected-test.html",
                    "utf8"
                );
                assert.equal(topic.body, expected);
            }
        }
    }
}).export(module);
