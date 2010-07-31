var vows = require("vows");
var assert = require("assert");

var server = require("../lib/server");
var http = require("../lib/http");
var ui = require("../lib/ui");
var visitor = require("../lib/visitor");
var Browsers = require("../lib/browsers").Browsers;

var PORT = 8088;

vows.describe("HTTP Server").addBatch({
    "when starting a server by itself" : {
        topic : function() {
            server.serve(PORT, this.callback);
        },
        "the server should start" : function (err) {
            assert.isUndefined(err);
        },
        // when we request a document
            // HTML should be injected
            // everything else is passed through
        "when we visit the test runner" : {
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
            "when we add a test" : {
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
                "when we check on a test" : {
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
                    "test data is returned" : function (results) {
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
}).run();
