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
                    "ua": "Mozilla/5.0 (X11; U; Linux x86_64; en-US) AppleWebKit/534.13 (KHTML, like Gecko) Chrome/9.0.597.19 Safari/534.13",
                    "type": "report",
                    "name": "YUI Test Results",
                    "yuisuite":{
                        "passed": 4,
                        "failed": 1,
                        "ignored": 0,
                        "total": 5,
                        "type": "testsuite",
                        "name": "yuisuite",
                        "Y.Anim":{
                            "passed": 4,
                            "failed": 1,
                            "ignored": 0,
                            "total": 5,
                            "type":"testcase",
                            "name":"Y.Anim",
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
                                "message":"Test failed.",
                                "type":"test",
                                "name":"test_stop"
                            },
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
                    }
            }, false, function(msg) {messages.push(msg);});
            return messages;
        },
        "should print results name as first line" : function (messages) {
            assert.include(messages[0], "YUI Test Result");
        },
        "should print user agent on the first line" : function (messages) {
            assert.include(messages[0], "on Chrome (9.0.597.19) / Linux");
        },
        "should contain an empty line as the last message" : function (messages) {
            assert.equal(messages[messages.length - 1], "");
        },
        "should print number of passed tests" : function (messages) {
            assert.include(messages[messages.length - 2], "4 passed");
        },
        "should print number of failed tests" : function (messages) {
            assert.include(messages[messages.length - 2], "1 failed");
        }
    }
}).export(module);
