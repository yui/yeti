"use strict";

var vows = require("vows");
var assert = require("assert");
var mockery = require("mockery");
var mocks = require("mocks");
var util = require("util");

var EventYoshi = require("eventyoshi");
var EventEmitter2 = require("../../lib/event-emitter");

function createLocalIpMock(ipAddress) {
    return  function () {
        return ipAddress;
    };
}

function MockWebDriver(host, port, user, pass) {
    this.host = host;
    this.port = port;
    this.user = user;
    this.pass = pass;
    this.url = null;
    this.desiredCapabilities = null;
    EventEmitter2.call(this);
}

util.inherits(MockWebDriver, EventEmitter2);

MockWebDriver.prototype.quit = function (cb) {
    this.emit("quit");
    cb(null);
};

MockWebDriver.prototype.get = function (url, cb) {
    this.emit("navigate", url);
    this.url = url;
    cb(null);
};

MockWebDriver.prototype.init = function (desiredCapabilities, cb) {
    this.desiredCapabilities = desiredCapabilities;
    cb(null);
};

function createWdMock(topic, cb) {
    return {
        remote: function (host, port, user, pass) {
            var mock = new MockWebDriver(host, port, user, pass);
            cb(mock);
            return mock;
        }
    };
}

function MockAgentManager() {
    this.agents = {};
    EventEmitter2.call(this);
}

util.inherits(MockAgentManager, EventEmitter2);

MockAgentManager.prototype.addAgent = function (agent) {
    this.agents[agent.id] = agent;
    this.emit("newAgent", agent);
};

MockAgentManager.prototype.removeAgent = function (agent) {
    delete this.agents[agent.id];
};

function createHubMock(topic) {
    return {
        server: {
            address: function () {
                return {
                    address: topic.ipAddress,
                    port: topic.port
                };
            }
        },
        webdriver: topic.wdOptions,
        agentManager: new MockAgentManager()
    };
}

vows.describe("WebDriver Agent Group").addBatch({
    "Given a WebDriverAgentGroup": {
        topic: function () {
            var topic = {},
                modulePath = "../../lib/hub/webdriver-agent",
                WebDriverAgentGroup;

            topic.wdYoshi = new EventYoshi();

            topic.ipAddress = "10.89.89.89";
            topic.wdOptions = {
                host: topic.ipAddress,
                port: 8090,
                user: "foo",
                pass: "bar"
            };
            topic.wdMock = createWdMock(topic, function yoshize(wdInstance) {
                topic.wdYoshi.add(wdInstance);
                wdInstance.once("quit", function () {
                    topic.wdYoshi.remove(wdInstance);
                });
            });
            topic.localIpMock = createLocalIpMock(topic.ipAddress);
            topic.hubMock = createHubMock(topic);

            mockery.enable({
                useCleanCache: true
            });

            mockery.registerAllowables([
                modulePath,
                "async",
                "./lib/async", // async dependency
                "url"
            ]);

            mockery.registerMock("wd", topic.wdMock);
            mockery.registerMock("../local-ip", topic.localIpMock);

            WebDriverAgentGroup = require(modulePath);

            topic.desiredCapabilities = [
                {
                    browserName: "chrome"
                }
            ];

            topic.driver = new WebDriverAgentGroup({
                hub: topic.hubMock,
                browsers: topic.desiredCapabilities
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
        "when launched": {
            topic: function (lastTopic) {
                var vow = this,
                    topic = lastTopic;

                topic.events = {
                    navigate: []
                };

                topic.wdYoshi.on("navigate", function (url) {
                    topic.events.navigate.push(url);
                    topic.hubMock.agentManager.addAgent({
                        id: /[\d]+$/.exec(url)[0]
                    });
                });

                topic.driver.launch(function (err) {
                    vow.callback(err, topic);
                });
            },
            "is ok": function (topic) {
                if (topic instanceof Error) { throw topic; }
            },
            "navigation occurs": function (topic) {
                assert.lengthOf(topic.events.navigate, topic.wdYoshi.children.length);
            },
            "and quit": {
                topic: function (lastTopic) {
                    var vow = this,
                        topic = lastTopic;

                    topic.driver.quit(function (err) {
                        vow.callback(err, topic);
                    });
                },
                "is ok": function (topic) {
                    if (topic instanceof Error) { throw topic; }
                },
                "browsers are closed": function (topic) {
                    assert.lengthOf(topic.wdYoshi.children, 0);
                    assert.lengthOf(topic.driver.browsers, 0);
                    assert.lengthOf(topic.driver.agentIds, 0);
                }
            }
        }
    }
}).export(module);
