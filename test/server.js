var vows = require("vows");
var assert = require("assert");

var server = require("../lib/server");
var http = require("../lib/http");
var ui = require("../lib/ui");
var visitor = require("../lib/visitor");

var Browser = require("../lib/browsers").Browser;
var Script = process.binding("evals").Script;

var port = 8089;

ui.quiet(1);

function request (code, path, body, method) {
    if (!code) code = 200;
    var options = {
        host : "localhost",
        method : "GET",
        path : path
    };
    if (body) options.body = body;
    if (method) options.method = method;
    return function (lastTopic) {
        var vow = this;
        // try to find port number
        var port = Array.prototype.slice.call(arguments, -1)[0];
        if (!isNaN(port))
            options.port = port;
        else throw new Error("Unable to determine port from topic.");
        if ("function" === typeof path)
            options.path = path(lastTopic);
        else if (!path)
            options.path = vow.context.name.split(/ +/)[1];
        http.request(
            options
        ).on("response", function X (res, results) {
            var err = null;
            if (res.statusCode !== code)
                err = options.method + " " + options.path
                      + ": " + res.statusCode
                      + " " + require("http").STATUS_CODES[res.statusCode]
                      + ": " + results;
            if (res.statusCode === 302) { // handle redirects
                options.path = res.headers.location;
                return http.request(options).on("response", X);
            }
            if (res.statusCode === 404 && !options._404) {
                // when Yeti gives a 404, the resource may be available
                // in the future. wait a moment then try again.
                // this typically happens when requesting /status
                // and a browser, using XHR transport, hasn't
                // reconnected before the test demands its status
                options._404 = true;
                return setTimeout(function () {
                    http.request(options).on("response", X);
                }, 2000);
            }
            vow.callback(err, results);
        });
    }
}

function requestTest (fixture) {
    return {
        topic : request(
            200,
            "/tests/add",
            { tests : [ __dirname + "/" + fixture + ".html" ] },
            "PUT"
        ),
        "the test id is returned" : function (id) {
            assert.isString(id);
        },
        "and the status is requested" : {
            topic : request(200, function (id) {
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
    };
}

function requestRunner (transport, browser) {
    return {
        topic : function (port) {
            var vow = this;
            var tests = server.getEmitterForPort(port);
            var cb = function (event, listener) {
                if ("add" !== event) return;
                vow.callback(null, listener);
                tests.removeListener("newListener", cb);
            };
            tests.on("newListener", cb);
            visitor.visit(
                [ browser || Browser.canonical() ],
                ["http://localhost:" + port + "/?transport=" + transport]
            );
        },
        "the server listens to the test add event" : function (listener) {
            assert.isFunction(listener);
        },
        "and a test is added" : requestTest("fixture"),
        "and a test with spaces is added" : requestTest("fixture with spaces/fixture again")
    };
}

function script () {
    return function (body) {
        var sandbox = { // super fake dom!
            window : {},
            document : {
                getElementById : function () {}
            }
        };
        Script.runInNewContext(body, sandbox);
        return sandbox;
    };
}

function exposeOnly (token) {
    return function (sandbox) {
        for (var i in sandbox) switch (i) {
            case "document":
            case "window":
            case token:
                break;
            default:
                return assert.fail(i + " should not be exposed");
        }
        assert.ok(1);
    };
}

function pass () {
    return function () {
        assert.ok(1); // yay, the topic didn't assert.fail()
    }
}

function httpify (port) {
    return function() {
        var vows = this;
        var cwd = process.cwd().split("/");
        if (
            "test" != cwd[cwd.length - 1]
        ) cwd.push("test");
        // the config.path is set to the test dir
        // everything outside shouldn't be served
        // (cli.js sets config.path to your cwd)
        server.serve(port, cwd.join("/"), function (err) {
            vows.callback(err, port);
        });
    };
}

function testBrowser (browser) {
    return {
        "for the default test runner": {
            topic : httpify(port++),
            "was requested" : requestRunner("", browser)
        },
        "for the XHR test runner": {
            topic : httpify(port++),
            "was requested" : requestRunner("xhr", browser)
        },
        "for the EventSource test runner": {
            topic : httpify(port++),
            "was requested" : requestRunner("eventsource", browser)
        }
    };
}

vows.describe("HTTP Server").addBatch({
    "A Yeti server" : {
        topic : httpify(port++),
        "should start" : function (port) {
            assert.ok(port);
        },
        "when something outside of the config.path is requested" : {
            topic : function () {
                var part, path = process.cwd().split("/");
                while (
                    part = path.pop()
                ) if (part == "yeti") break;
                path = path.concat(part, "LICENSE");
                // we are requesting ../LICENSE
                // which is outside of our config.path
                // for security reasons, this must fail
                request(
                    403,
                    "/project" + path.join("/")
                ).apply(this, arguments);
            },
            "the request should be denied" : pass()
        },
        "when /inc/inject.js is requested" : {
            topic : request(),
            "the document should be valid JavaScript" : {
                    topic : script(),
                    "and have the function $yetify" : function (sandbox) {
                        assert.isFunction(sandbox.$yetify);
                    },
                    "and expose only $yetify" : exposeOnly("$yetify")
            },
            "the document should contain $yetify" : function (body) {
                assert.include(body, "$yetify");
            }
        },
        "when /inc/run.js is requested" : {
            topic : request(),
            "the document should be valid JavaScript" : {
                    topic : script(),
                    "and have the object YETI" : function (sandbox) {
                        assert.isObject(sandbox.YETI);
                    },
                    "and have the function YETI.start" : function (sandbox) {
                        assert.isFunction(sandbox.YETI.start);
                    },
                    "and expose only YETI" : exposeOnly("YETI")
            },
            "the document should contain YETI" : function (body) {
                assert.include(body, "YETI");
            }
        },
        "when /favicon.ico is requested" : {
            topic : request(),
            "there should be a response" : pass()
        },
        "when an HTML document is requested" : {
            topic : request(200, "/project" + __dirname + "/fixture.html"),
            "the document should have $yetify" : function (body) {
                assert.isString(body);
                var cachebuster = server.getCachebuster();
                var injection = "<script src=\"/dyn/" + cachebuster + "/inject.js\"></script><script>$yetify({url:\"/results\"});</script>";
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
            topic : request(200, "/project" + __dirname + "/fixture.css"),
            "the document should be served unmodified" : function (body) {
                assert.equal(body, "a{}\n");
            }
        }
    },
    "A Yeti server visited by the canonical browser" : testBrowser(),
    "A Yeti server visited by Chrome" : testBrowser("chrome")
}).export(module);
