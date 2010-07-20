var Class = require("class").Class;
var exec = require("child_process").exec;

var opening = false;

var Browser = new Class({
    // sync flag
    opening : false,
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
        var self = this;
        var cmd = [];
        var cb;
        var args = Array.prototype.slice.call(arguments);
        args.forEach(function (arg) {
            if ("function" === typeof arg) cb = arg;
            else cmd.push(arg);
        });
        // console.log("run: " + cmd.join(" "));
        var opener = function () {
            self.opening = true;
            exec(cmd.join(" "), function (err) {
                self.opening = false;
                if (cb) cb(err);
                else if (err) throw err;
            });
        };
        // we can't tell a browser to open something else
        // while it's still trying to open the last page.
        (function X () {
            if (self.opening) process.nextTick(X);
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
    open : function (application, url) {
        if (!this.macos) throw new Error("open is only available on MacOS.");
        this.exec("open -g -a", application, "'" + url + "'");
    },
    contains : function (a, b) {
        a = a.toLowerCase();
        return a.indexOf(b) !== -1;
    },
    supported : function () { return true; },
    agent : function () { return false; },
    setup : function () {},
    visit : function () {}
});

var Browsers = {};

Browsers.Default = Browser.extend({
    visit : function (url) {
        if (this.macos) this.exec("open -g", url);
        if (this.windows) this.exec("start", url);
        if (this.linux) this.exec("xdg-open", url);
    },
    match : function (input) {
        return this.contains(input, "default");
    }
});

Browsers.Safari = Browser.extend({
    supported : function () {
        return this.macos;
    },
    visit : function (url) {
        this.applescript('tell application "Safari" to set URL of (make new document) to "' + url + '"');
    },
    match : function (input) {
        return this.contains(input, "safari");
    },
    agent : function (agent) {
        return this.contains(agent, "safari")
               && !this.contains(agent, "chrome");
    }
});

Browsers.Firefox = Browser.extend({
    supported : function () {
        return this.macos || this.linux || this.windows;
    },
    visit : function (url) {
        if (this.macos) this.open("Firefox", url);
        if (this.linux) this.exec("firefox", url);
        if (this.windows) this.exec(
            [
                process.env.ProgramFiles || "c:\\Program Files",
                "Mozilla Firefox", "firefox.exe"
            ].join("\\"),
            url
        );
    },
    match : function (input) {
        return this.contains(input, "firefox");
    },
    agent : function (agent) {
        return this.contains(agent, "firefox");
    }
});

Browsers.Chrome = Browser.extend({
    supported : function () {
        return this.macos || this.linux;
    },
    visit : function (url) {
        if (this.macos) this.open("Google\\ Chrome", url);
        if (this.linux) this.exec("google-chrome", url);
    },
    match : function (input) {
        return this.contains(input, "chrome");
    },
    agent : function (agent) {
        return this.contains(agent, "chrome");
    }
});

Browsers.canonical = function () {
    var b = new Browser;
    if (b.macos) return "Safari";
    if (b.windows) return "Firefox";
    if (b.linux) return "Firefox";
};

Browsers.supported = function () {
    var browsers = [];
    for (var name in Browsers) {
        var b = new Browsers[name];
        if (b.supported()) browsers.push(name);
    }
    return browsers;
}

Browsers.pick = function (input) {
    for (var name in Browsers) {
        var b = new Browsers[name];
        if (b.pick(input)) return b;
    }
    return new Browsers.Default();
};

Browsers.forAgent = function (agent) {
    for (var name in Browsers) {
        if ((new Browsers[name]).agent(agent)) {
            return name;
        }
    }
    return "Unknown";
};

exports.Browsers = Browsers;
