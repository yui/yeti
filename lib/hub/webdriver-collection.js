"use strict";

var async = require("async");
var wd = require("wd");
var url = require("url");
var periodicRegistry = require("./periodic-registry").getRegistry();
var getLocalIP = require("../local-ip");

function WebDriverCollection(options) {
    this.desiredCapabilities = options.browsers;
    this.hub = options.hub;

    if (options.webdriver) {
        this.remote = options.webdriver;
    } else {
        this.remote = options.hub.webdriver;
    }

    this.allAgents = options.hub.allAgents;
    this.browsers = [];
    this.agentIds = [];
    var address = options.hub.server.address();

    this.id = this.getRandomId();

    this.url = url.format({
        protocol: ("requestCert" in options.hub.server) ? "https" : "http",
        hostname: getLocalIP(),
        port: address.port
    });
}

WebDriverCollection.prototype.getRandomId = function () {
    return String(Date.now()) + String(Math.random() * 0x1000000 | 0);
};

WebDriverCollection.prototype.quit = function (cb) {
    var self = this,
        queue = [];

    self.ended = true;

    periodicRegistry.remove("webdriver-ping-" + self.id);

    self.browsers.forEach(function (browser) {
        queue.push(browser.quit.bind(browser));
    });

    self.agentIds.forEach(function (agentId) {
        self.allAgents.removeAgent(agentId);
    });

    self.browsers = [];
    self.agentIds = [];

    async.parallel(queue, cb);
};

WebDriverCollection.prototype._ping = function () {
    // Keep the browsers alive by sending a noop command.
    this.browsers.forEach(function (browser) {
        browser.title(function NOOP() {});
    });
};

WebDriverCollection.prototype._launch = function (desired, cb) {
    var self = this,
        browser,
        remote = this.remote,
        url = self.url,
        id = this.getRandomId();

    url += "/agent/" + id;

    self.agentIds.push(id);

    browser = wd.remote(remote.host, remote.port, remote.user, remote.pass);

    function completer(err) {
        if (self.ended) {
            self.quit(function () {
                cb("Session ended.");
            });
        }

        if (err) {
            cb(err);
            return;
        }

        cb(err, browser);
    }

    function navigate() {
        var browserLoaded = false,
            agentLoaded = false;

        function check(err) {
            if (err) {
                completer(err);
            } else if (self.ended) {
                completer(null); // calls quit
            } else if (browserLoaded && agentLoaded) {
                completer(null);
            } else {
                return;
            }

        }

        function onGet(err) {
            browserLoaded = true;

            check(err);
        }

        function onAgent(agent) {
            if (agent.id === id) {
                agentLoaded = true;
                self.allAgents.removeListener("newAgent", onAgent);
                check();
            }
        }

        self.allAgents.on("newAgent", onAgent);
        browser.get(url, onGet);
    }

    browser.init(desired, function (err) {
        if (err) {
            return cb(err);
        }

        self.browsers.push(browser);

        if (self.ended) {
            self.quit();
        } else {
            navigate();
        }

    });
};

WebDriverCollection.prototype.launch = function (cb) {
    var self = this,
        queue = [];

    self.desiredCapabilities.forEach(function (capability) {
        queue.push(self._launch.bind(self, capability));
    });

    periodicRegistry.add("webdriver-ping-" + self.id, self._ping.bind(self), 15000);

    async.parallel(queue, cb);
};

module.exports = WebDriverCollection;
