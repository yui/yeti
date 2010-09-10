var vows = require("vows");
var assert = require("assert");

var server = require("../lib/server");
var visitor = require("../lib/visitor");

var Browser = require("../lib/browsers").Browser;

var macros = require("../lib/macros"),
    request = macros.request,
    httpify = macros.httpify;

function requestTest (fixture) {
    return {
        topic : request(
            200,
            "/tests/add",
            { tests : [ __dirname + "/../test/" + fixture + ".html" ] },
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

function testBrowser (browser) {
    return {
        "for the EventSource test runner": {
            topic : httpify(),
            "was requested" : requestRunner("eventsource", browser)
        }
    };
}

var ui = require("../lib/ui");
ui.verbose(1)

vows.describe("Visitors").addBatch({
    "A Yeti server visited by the canonical browser" : testBrowser("")
}).export(module);
