var vows = require("vows");
var assert = require("assert");

var ui = require("../lib/ui");

vows.describe("UI").addBatch({
    "Formatting results for console" : {
        topic : function () {
            var messages = [];
            ui.formatters.console({
                    "passed": 4,
                    "failed": 1,
                    "ignored": 0,
                    "total": 5,
                    "timestamp": "Wed Dec 22 2010 17:27:40 GMT-0200 (BRST)",
                    "ua": "Mozilla/5.0 (X11; U; Linux x86_64; en-US) AppleWebKit/534.13 (KHTML, like Gecko) Chrome/9.0.597.19 Safari/534.13",
                    "type": "report",
                    "name": "my.test.suite",
                    "case1": {
                        "passed": 2,
                        "failed": 1,
                        "ignored": 0,
                        "total": 3,
                        "type": "testcase",
                        "name": "case1",
                        "test_getEl":{
                            "result":"pass",
                            "message":"Test passed.",
                            "type":"test",
                            "name":"test_getEl"
                        },
                        "test_isAnimated":{
                            "result":"pass",
                            "message":"Test passed.",
                            "type":"test",
                            "name":"test_isAnimat"
                        },
                        "test_stop":{
                            "result":"fail",
                            "message":"Yo, dawg. Test has failed.",
                            "type":"test",
                            "name":"test_stop"
                        }
                    },
                    "case2": {
                        "passed": 1,
                        "failed": 1,
                        "ignored": 0,
                        "total": 2,
                        "type": "testcase",
                        "name": "case2",
                        "test_onStart":{
                            "result":"pass",
                            "message":"Test passed.",
                            "type":"test",
                            "name":"test_onStart"
                        },
                        "test_endValue":{
                            "result":"pass",
                            "message":"Test passed.",
                            "type":"test",
                            "name":"test_endValue"
                        }
                    }
            }, false, function(msg) {messages.push(msg);});
            return messages;
        },
        "should print results name as first line" : function (messages) {
            assert.include(messages[0], "my.test.suite");
        },
        "should print user agent on the first line" : function (messages) {
            assert.include(messages[0], "on Chrome (9.0.597.19) / Linux");
        },
        "should contain an empty line as the last message" : function (messages) {
            assert.equal(messages[messages.length - 1], "");
        },
        "should print number of passed tests" : function (messages) {
            assert.include(messages[1], "4 passed");
        },
        "should print number of failed tests" : function (messages) {
            assert.include(messages[1], "1 failed");
        }
    }
}).addBatch({
    "Formatting results for subunit" : {
        topic : function () {
            var messages = [];
            ui.formatters.subunit({
                    "passed": 4,
                    "failed": 1,
                    "ignored": 0,
                    "total": 5,
                    "timestamp": "Wed Dec 22 2010 17:27:40 GMT-0200 (BRST)",
                    "ua": "Mozilla/5.0 (X11; U; Linux x86_64; en-US) AppleWebKit/534.13 (KHTML, like Gecko) Chrome/9.0.597.19 Safari/534.13",
                    "type": "report",
                    "name": "my.test.suite",
                    "case1": {
                        "passed": 2,
                        "failed": 1,
                        "ignored": 0,
                        "total": 3,
                        "type": "testcase",
                        "name": "case1",
                        "test_getEl":{
                            "result":"pass",
                            "message":"Test passed.",
                            "type":"test",
                            "name":"test_getEl",
                            "duration": 25
                        },
                        "test_isAnimated":{
                            "result":"pass",
                            "message":"Test passed.",
                            "type":"test",
                            "name":"test_isAnimat",
                            "duration": 125
                        },
                        "test_stop":{
                            "result":"fail",
                            "message":"Yo, dawg. Test has failed.",
                            "type":"test",
                            "name":"test_stop",
                            "duration": 12
                        }
                    },
                    "case2": {
                        "passed": 1,
                        "failed": 1,
                        "ignored": 0,
                        "total": 2,
                        "type": "testcase",
                        "name": "case2",
                        "test_onStart":{
                            "result":"pass",
                            "message":"Test passed.",
                            "type":"test",
                            "name":"test_onStart",
                            "duration": 15
                        },
                        "test_endValue":{
                            "result":"pass",
                            "message":"Test passed.",
                            "type":"test",
                            "name":"test_endValue",
                            "duration": 10
                       }
                    }
            }, false, function(msg) {messages.push(msg);});
            return messages;
        },
        "should test result timestamp in iso8601 format as the first line" : function (messages) {
            assert.equal(messages[0], "time: 2010-12-22T19:27:40.000");
        },
        "should print full test name including suite and mangled user agent" : function (messages) {
            assert.equal(messages[1], "test: my.test.suite.case1.test_getEl.Chrome_9_0_597_19_Linux");
        },
        "should print a timestamp (initial + duration) for the first test" : function (messages) {
            assert.equal(messages[2], "time: 2010-12-22T19:27:40.025");
        },
        "should print success plus test name for passing test" : function (messages) {
            assert.equal(messages[3], "success: my.test.suite.case1.test_getEl.Chrome_9_0_597_19_Linux");
        },
        "should print a timestamp (initial + 1st duration + 2nd duration + test) for the failed test" : function (messages) {
            assert.equal(messages[8], "time: 2010-12-22T19:27:40.162");
        },
        "should print failure plus test name for failed test" : function (messages) {
            assert.equal(messages[9], "failure: my.test.suite.case1.test_stop.Chrome_9_0_597_19_Linux [");
        },
        "should print failure message after failure note" : function (messages) {
            assert.equal(messages[10], "Yo, dawg. Test has failed.");
            assert.equal(messages[11], "]");
        }
    }
}).export(module);
