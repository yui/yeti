var exec = require("child_process").exec;

var Browser = new Class({
    constructor : function () {
        this.macos = this.windows = this.linux = false;
        switch (process.platform.toLowerCase()) {
            case "darwin":
                this.macos = true;
                break;
            case "mingw":
            case "mswin":
                this.windows = true;
                break;
            case "linux":
                this.linux = true;
                break;
        }
        if (!this.supported()) throw new Error("This browser is not supported on this platform.");
        this.setup();
    },
    exec : function () {
        var cmd = [];
        var cb;
        var args = Array.prototype.slice.call(arguments);
        args.forEach(function (arg) {
            if ("function" === typeof arg) cb = arg;
            else cmd.push(arg);
        });
        if (!cb) cb = function (err) {
            if (err) throw new Error("Browser#exec failed: " + err);
        };
        console.log("run: " + cmd.join(" "));
        return exec(cmd.join(" "), cb);
    },
    applescript : function (as) {
        if (!this.macos) throw new Error("AppleScript can only run on MacOS.");
        this.exec("osascript -e '" + as + "'");
    },
    supported : function () {},
    agent : function () {},
    setup : function () {},
    visit : function () {}
});

var Browsers = {};

Browsers.Default = Browser.extend({
    supported : function () {
        return true;
    },
    visit : function (url) {
        if (this.macos) this.exec("open", url);
        if (this.windows) this.exec("start", url);
        if (this.linux) this.exec("xdg-open", url);
    }
});

Browsers.Safari = Browser.extend({
    supported : function () {
        return this.macos;
    },
    setup : function () {
        this.applescript('tell application "Safari" to make new document');
    },
    visit : function (url) {
        this.applescript('tell application "Safari" to set URL of front document to "' + url + '"');
    },
    agent : function (agent) {
        agent = agent.toLowerCase();
        return
            agent.indexOf("safari") !== -1
            && agent.indexOf("chrome") === -1;
    }
});

exports.Browsers = Browsers;
