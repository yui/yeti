var vows = require("vows");
var assert = require("assert");

var server = require("../lib/server");
var http = require("../lib/http");
var ui = require("../lib/ui");
var visitor = require("../lib/visitor");
var Browsers = require("../lib/browsers").Browsers;

var PORT = 8088;

function request (path, body, method) {
    var options = {
        host : "localhost",
        port : PORT,
        method : "GET",
        path : path
    };
    if (body) options.body = body;
    if (method) options.method = method;
    return function (lastTopic) {
        if ("function" === typeof path)
            options.path = path(lastTopic);
        var vow = this;
        http.request(
            options
        ).on("response", function (res, results) {
            var err = null;
            if (res.statusCode !== 200)
                err = res.statusCode + " " + http.STATUS_CODES[res.statusCode];
            vow.callback(err, results);
        });
    }
}

vows.describe("HTTP Server").addBatch({
    "A Yeti server" : {
        topic : function() {
            server.serve(PORT, this.callback);
        },
        "should start" : function (err) {
            assert.isUndefined(err);
        },
        "when an HTML document is requested" : {
            topic : request("/project/" + __dirname + "/fixture.html"),
            "the document should have $yetify" : function (body) {
                assert.isString(body);
                var injection = "<script src=\"/inc/inject.js\"></script><script>$yetify({url:\"/results\"});</script>";
                assert.include(body, injection);
                // injection appears at the end:
                var idx = body.indexOf(injection);
                assert.equal(
                    idx + injection.length,
                    body.length
                );
            }
        },
        "when a CSS document is requested" : {
            topic : request("/project/" + __dirname + "/fixture.css"),
            "the document should be served unmodified" : function (body) {
                assert.equal(body, "a{}\n");
            }
        },
        "when the test runner was requested" : {
            topic : function () {
                var vow = this;
                var cb = function (event, listener) {
                    if ("add" !== event) return;
                    vow.callback(null, listener);
                    server.tests.removeListener("newListener", cb);
                };
                server.tests.on("newListener", cb);
                visitor.visit(
                    [ Browsers.canonical() ],
                    ["http://localhost:" + PORT]
                );
            },
            "the server listens to the test add event" : function (listener) {
                assert.isFunction(listener);
            },
            "and a test is added" : {
                topic : request(
                    "/tests/add",
                    { tests : [ __dirname + "/fixture.html" ] },
                    "PUT"
                ), 
                "the test id is returned" : function (id) {
                    assert.isString(id);
                },
                "and the status is requested" : {
                    topic : request(function (id) {
                        return "/status/" + id;
                    }),
                    "the test data is returned" : function (results) {
                        assert.isObject(results);
                        assert.include(results, "passed");
                        assert.include(results, "failed");
                        assert.include(results, "name");
                        assert.include(results, "total");
                    },
                    "the suite passed" : function (result) {
                        assert.ok(result.passed);
                        assert.equal(result.failed, 0);
                    }
                }
            }
        }
    }
}).export(module);
