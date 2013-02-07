"use strict";

var vows = require("vows");
var assert = require("assert");
var mockery = require("mockery");
var mocks = require("mocks");

function createFsMock() {
    var fs = mocks.fs.create({
        'home': {
            '.yeti_config.json': 1,
            'yeti': {
                'project': {
                    'a.js': 1
                }
            }
        }
    });

    fs.existsSync = function (path) {
        var exists = true;

        try {
            fs.readFileSync(path);
        } catch (ex) {
            exists = false;
        }

        return exists;
    };

    return fs;
}

vows.describe("Configuration").addBatch({
    "Given a Configuration": {
        topic: function () {
            var topic = {},
                configurationModulePath = "../../lib/configuration",
                Configuration;

            topic.fsMock = createFsMock();

            mockery.enable({
                useCleanCache: true
            });

            mockery.registerAllowables([
                configurationModulePath,
                "./events",
                "eventemitter2",
                "proto-list",
                "path",
                "util"
            ]);

            mockery.registerMock("graceful-fs", topic.fsMock);

            Configuration = require(configurationModulePath).Configuration;

            topic.config = new Configuration();
            topic.config.printLogEventsForLevel("Configuration", "debug");
            topic.config.setFilename('.yeti_config.json');

            return topic;
        },
        teardown: function (topic) {
            mockery.deregisterAll();
            mockery.disable();
        },
        "is ok": function (topic) {
            if (topic instanceof Error) { throw topic; }
        },
        "calling locate finds the config file": function (topic) {
            var filename = topic.config.locate('/home/yeti/project');
            assert.strictEqual(filename, '/home/.yeti_config.json');
        },
        "calling locate does not find files that do not exist": function (topic) {
            var filename;
            topic.config.setFilename('.bogus.json');
            assert.isNull(topic.config.locate('/home/yeti/project'));
            topic.config.setFilename('.yeti_config.json');
        }
    }
}).export(module);
