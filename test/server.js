var vows = require("vows");
var assert = require("assert");

var server = require("../lib/server");
var ui = require("../lib/ui");

var Script = process.binding("evals").Script;

var macros = require("../lib/macros"),
    request = macros.request,
    httpify = macros.httpify;

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

ui.quiet(1);

vows.describe("HTTP Server").addBatch({
    "A Yeti server" : {
        topic : httpify(),
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
    }
}).export(module);
