"use strict";

var vows = require("vows");
var assert = require("assert");
var pact = require("pact");

var yeti = require("../lib/yeti");

vows.describe("Yeti Hub HTTP errors").addBatch({
    "Hub setup and connection" : {
        topic : pact.httpify(yeti.createHub()),
        "when a non-GET or HEAD request is used" : {
            topic : pact.request({
                url : "/",
                method : "PUT"
            }),
            "should return a 405 error" : pact.code(405),
            "should return the proper error message" : function (topic) {
                assert.equal(topic.body, "Method Not Allowed\n" +
                                         "GET or HEAD method required.");
            }
        },
        "when the desired route is not found" : {
            topic : pact.request({
                url : "/foobar"
            }),
            "should return a 404 error" : pact.code(404),
            "should return the proper error message" : function (topic) {
                assert.equal(topic.body, "Not Found\n" + 
                                         "Unable to find what you're looking for.");
            }
        },
        "when a HEAD request is not found" : {
            topic : pact.request({
                url : "/foobar",
                method : "HEAD"
            }),
            "should end with no message" : function (topic) {
                assert.equal(topic.body, "");
            }
        }
    }
}).export(module);
