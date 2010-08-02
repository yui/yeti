var vows = require("vows");
var assert = require("assert");

var server = require("../lib/server");
var http = require("../lib/http");
var ui = require("../lib/ui");
var visitor = require("../lib/visitor");
var Browsers = require("../lib/browsers").Browsers;

var PORT = 8088;

vows.describe("HTTP Server").addBatch({
    "A Yeti server" : {
        topic : function() {
            server.serve(PORT, this.callback);
        },
        "should start" : function (err) {
            assert.isUndefined(err);
        },
        "when an HTML document is requested" : {
            topic : function () {
                var vow = this;
                this.requestOptions = {
                    host : "localhost",
                    port : PORT,
                    method : "GET",
                    path : "/project/" + __dirname + "/fixture.html"
                };
                http.request(
                    this.requestOptions
                ).on("response", function (res, body) {
                    vow.callback(
                        res.statusCode === 200 ? null : "Non-200 repsonse code",
                        body
                    );
                });
            },
            "the document should have $yetify" : function (body) {
                assert.ok(body);
                var injection = "<script src=\"/inc/inject.js\"></script><script>$yetify({url:\"/results\"});</script>";
                var idx = body.indexOf(injection);
                // body should contain injection:
                assert.ok(-1 !== idx);
                // injection appears at the end:
                assert.ok(
                    idx + injection.length
                    === body.length
                );
            }
        },
        "when a CSS document is requested" : {
            topic : function () {
                var vow = this;
                this.requestOptions = {
                    host : "localhost",
                    port : PORT,
                    method : "GET",
                    path : "/project/" + __dirname + "/fixture.css"
                };
                http.request(
                    this.requestOptions
                ).on("response", function (res, body) {
                    vow.callback(
                        res.statusCode === 200 ? null : "Non-200 repsonse code",
                        body
                    );
                });
            },
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
                topic : function () {
                    var vow = this;
                    this.requestOptions = {
                        host : "localhost",
                        port : PORT,
                        method : "PUT",
                        path : "/tests/add",
                        body : {
                            tests : [ __dirname + "/fixture.html" ]
                        }
                    }
                    http.request(
                        this.requestOptions
                    ).on("response", function (res, id) {
                        vow.callback(
                            res.statusCode === 200 ? null : "Non-200 repsonse code",
                            id
                        );
                    });
                },
                "the test id is returned" : function (id) {
                    assert.isString(id);
                },
                "and the status is requested" : {
                    topic : function (id) {
                        var vow = this;
                        this.requestOptions.method = "GET";
                        this.requestOptions.path = "/status/" + id;
                        delete this.requestOptions.body;
                        delete this.requestOptions.headers;
                        http.request(
                            this.requestOptions
                        ).on("response", function (res, results) {
                            vow.callback(
                                res.statusCode === 200 ? null : res.statusCode + " repsonse code",
                                results
                            );
                        });
                    },
                    "the test data is returned" : function (results) {
                        // ui.results(results);
                        assert.isObject(results);
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
