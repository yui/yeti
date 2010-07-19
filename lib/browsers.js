var exec = require("child_process").exec;

// sync flag
var opening = false;

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
        // console.log("run: " + cmd.join(" "));
        var opener = function () {
            exec(cmd.join(" "), function (err) {
                opening = false;
                if (cb) cb(err);
                else if (err) throw err;
            });
        };
        // we can't tell a browser to open something else
        // while it's still trying to open the last page.
        (function X () {
            if (opening) process.nextTick(X);
            else opener();
        })();
    },
    applescript : function (as) {
        if (!this.macos) throw new Error("AppleScript can only run on MacOS.");
        this.exec("osascript -e '" + as + "'", function (err) {
            if (err) throw new Error(
                "AppleScript error. If you got an error while loading a ScriptingAddition, consider removing it.\n"
                + err
            );
        });
    },
    supported : function () {},
    agent : function () { return false; },
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
    visit : function (url) {
        this.applescript('tell application "Safari" to set URL of (make new document) to "' + url + '"');
    },
    agent : function (agent) {
        agent = agent.toLowerCase();
        return agent.indexOf("safari") !== -1
            && agent.indexOf("chrome") === -1;
    }
});

exports.Browsers = Browsers;
