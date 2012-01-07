"use strict";

var assert = require("assert");
var vows = require("vows");
var path = require("path");
var fs = require("graceful-fs");
var mockWritableStream = require("./lib/writable-stream");

var Beryl = require("../lib/provider/beryl");

function mockRequest() {
    return {
        headers : {}
    };
}

function createBeryl() {
    return new Beryl('\n<script src="/yeti/inject.js"></script>');
}

var passthruFiles = [__dirname + "/fixture/test.js"];
var htmlFiles = [__dirname + "/fixture/test.html"];

vows.describe("Beryl").addBatch({
    "A writable stream": {
        topic : mockWritableStream(),
        "is valid": function (stream) {
            assert.isFunction(stream.write);
        },
        "when normal documents are streamed to by Beryl streamFiles": {
            topic: function (lastTopic) {
                var vow = this;
                createBeryl().streamFiles({
                    req: mockRequest(),
                    res: lastTopic,
                    files: passthruFiles
                }, function (err) {
                    vow.callback(err, lastTopic);
                });
            },
            "contains valid data": function (topic) {
                assert.ok(topic.$store);
            },
            "contains unchanged data": function (topic) {
                var expected = "";
                passthruFiles.forEach(function (file) {
                    expected += fs.readFileSync(file, "utf8");
                });
                assert.equal(topic.$store, expected);
            }
        },
    },
    "Another writable stream": {
        topic: mockWritableStream(),
        "is valid" : function (stream) {
            assert.isFunction(stream.write);
        },
        "when an HTML document is streamed to by Beryl streamFiles": {
            topic: function (lastTopic) {
                var vow = this;
                createBeryl().streamFiles({
                    req: mockRequest(),
                    res: lastTopic,
                    files: htmlFiles
                }, function (err) {
                    vow.callback(err, lastTopic);
                });
            },
            "contains valid data": function (topic) {
                assert.ok(topic.$store);
            },
            "contains correct data with HTML injection": function (topic) {
                var expected = "";
                htmlFiles.forEach(function (file) {
                    var basename = path.basename(file),
                        dirname = path.dirname(file);
                    expected += fs.readFileSync(dirname + "/expected-" + basename, "utf8");
                });
                assert.equal(topic.$store, expected);
            }
        }
    }
}).export(module);
