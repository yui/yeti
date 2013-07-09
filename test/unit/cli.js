"use strict";

var vows = require("vows");
var assert = require("assert");
var mockery = require("mockery");

var EventEmitter = require("events").EventEmitter;

var streams = require("../lib/streams");

var Configuration = require("../../lib/cli/configuration");

function createProcessMock() {
    var mock = new EventEmitter();
    mock.cwd = function () {
        return "/cwd";
    };
    return mock;
}

function createHubMock() {
    function Hub(options) {
        this.options = options;
    }

    return Hub;
}

vows.describe("CLI").addBatch({
    "Given a CLI": {
        topic: function () {
            var topic = {},
                cliModulePath = "../../lib/cli",
                CLI;

            topic.mockProcess = createProcessMock();
            topic.mockHub = createHubMock();

            mockery.enable();
            mockery.registerAllowable(cliModulePath);
            mockery.registerMock('../hub', topic.mockHub);

            CLI = require(cliModulePath).CLI;

            topic.exitCode = null;
            function exitFn(code) {
                topic.exitCode = code;
            }

            topic.cli = new CLI({
                stdin: new streams.MockReadableStream(),
                stdout: new streams.MockWritableStream(),
                stderr: new streams.MockWritableStream(),
                exitFn: exitFn,
                process: topic.mockProcess
            });

            return topic;
        },
        teardown: function (topic) {
            mockery.deregisterAll();
            mockery.disable();
        },
        "is ok": function (topic) {
            if (topic instanceof Error) { throw topic; }
        },
        "calling setupExceptionHandler works as expected": function (topic) {
            assert.lengthOf(topic.mockProcess.listeners("uncaughtException"), 0);
            topic.cli.setupExceptionHandler();
            assert.lengthOf(topic.mockProcess.listeners("uncaughtException"), 1);
            topic.cli.setupExceptionHandler();
            assert.lengthOf(topic.mockProcess.listeners("uncaughtException"), 1,
                "Only one handler should be installed.");
        },
        "the parseBrowser function given ie/windows 7 is parsed correctly": function (topic) {
            var cap,
                caps = topic.cli.parseBrowsers(["ie/windows 7"]);
            assert.isNull(topic.exitCode);
            cap = caps.pop();
            assert.strictEqual(cap.browserName, "internet explorer");
            assert.strictEqual(cap.platform, "WINDOWS 7");
            assert.include(cap.name, "Automated Browser");
        },
        "the parseBrowser function given ie/windows/8 is parsed correctly": function (topic) {
            var cap,
                caps = topic.cli.parseBrowsers(["ie/windows/8"]);
            assert.isNull(topic.exitCode);
            cap = caps.pop();
            assert.strictEqual(cap.browserName, "internet explorer");
            assert.strictEqual(cap.platform, "WINDOWS");
            assert.strictEqual(cap.version, "8");
            assert.include(cap.name, "Automated Browser");
        },
        "the parseBrowser function given chrome/mac is parsed correctly": function (topic) {
            var cap,
                caps = topic.cli.parseBrowsers(["chrome/mac"]);
            assert.isNull(topic.exitCode);
            cap = caps.pop();
            assert.strictEqual(cap.browserName, "chrome");
            assert.strictEqual(cap.platform, "MAC");
            assert.isUndefined(cap.version);
            assert.include(cap.name, "Automated Browser");
        },
        "the parseBrowser function given safari/os x is ambigious": function (topic) {
            topic.cli.parseBrowsers(["safari/os x"]);
            assert.strictEqual(topic.exitCode, 1);
        },
        "calling createHub creates a hub": function (topic) {
            var config,
                hub,
                fixture;

            fixture = {
                loglevel: "foo",
                "wd-host": "bar",
                "wd-port": "baz",
                "wd-user": "quux",
                "wd-pass": "dogcow"
            };

            config = new Configuration();

            config.import(fixture);

            hub = topic.cli.createHub(config);

            assert.strictEqual(hub.options.loglevel, fixture.loglevel);
            assert.strictEqual(hub.options.webdriver.host, fixture["wd-host"]);
            assert.strictEqual(hub.options.webdriver.port, fixture["wd-port"]);
            assert.strictEqual(hub.options.webdriver.user, fixture["wd-user"]);
            assert.strictEqual(hub.options.webdriver.pass, fixture["wd-pass"]);
        }
    }
}).export(module);
