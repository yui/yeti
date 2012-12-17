var async = require("async");
var wd = require("wd");
var url = require("url");
var getLocalIP = require("../ip").getLocalIP;

function WebDriverAgentGroup(hub) {
    this.hub = hub;

    this.remote = hub.webdriver;
    this.agentManager = hub.agentManager;
    this.browsers = [];
    this.agents = [];
    var address = hub.server.address();

    this.url = url.format({
        protocol: ("requestCert" in hub.server) ? "https" : "http",
        hostname: getLocalIP(),
        port: address.port
    });

    console.log("URL to open", this.url);
}

WebDriverAgentGroup.prototype.quit = function (cb) {
    var queue = [];

    this.browsers.forEach(function (browser) {
        queue.push(browser.quit.bind(browser));
    });

    this.agents.forEach(function (agent) {
        queue.push(agent.unload.bind(agent));
    });

    async.parallel(queue, cb);
};

WebDriverAgentGroup.prototype._launch = function (desired, cb) {
    var self = this,
        browser,
        remote = this.remote;

    // TODO else fail

    browser = wd.remote(remote.host, remote.port, remote.user, remote.pass);

    function completer(err) {
        if (err) {
            cb(err);
            return;
        }

        self.browsers.push(browser);

        cb(err, browser);
    }

    function navigate() {
        async.parallel([
            function (cb) {
                browser.get(self.url, cb);
            },
            function (cb) {
                self.agentManager.on("newAgent", function (agent) {
                    self.agents.push(agent);
                    cb(null);
                });
            }
        ], completer);
    }

    browser.init(desired, function (err) {
        if (err) {
            return cb(err);
        }

        navigate();
    });
};

WebDriverAgentGroup.prototype.launch = function (browsers, cb) {
    var self = this,
        queue = [];

    browsers.forEach(function (browser) {
        queue.push(self._launch.bind(self, browser));
    });

    async.parallel(queue, cb);
};

module.exports = WebDriverAgentGroup;
