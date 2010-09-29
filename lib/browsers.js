var exec = require("child_process").exec;
var sys = require("sys");

var Browsers = {};

function createBrowser (name, proto) {
    Browsers[name] = function () {
        Browser.apply(this);
    };
    sys.inherits(Browsers[name], Browser);
    for (
        var k in proto
    ) Browsers[name].prototype[k] = proto[k];
}

function Browser () {
    this.opening = this.macos = this.windows = this.linux = false;
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
    this.setup();
}

Browser.prototype.exec = function () {
    if (!this.supported()) throw new Error("This browser is not supported on this platform.");
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
};

Browser.prototype.open = function (application, url) {
    if (!this.macos) throw new Error("open is only available on MacOS.");
    this.exec("open -g -a", application, "'" + url + "'");
};

var contains = function (a, b) {
    a = a.toLowerCase();
    return a.indexOf(b) !== -1;
};

Browser.prototype.supported = function () {
    return true;
};

Browser.prototype.agent = function () {
    return false;
};

Browser.prototype.setup = function () {};
Browser.prototype.visit = function () {};

var Default = createBrowser("Default");

createBrowser("Default", {
    visit : function (url) {
        if (this.macos) this.exec("open -g", url);
        if (this.windows) this.exec("start", url);
        if (this.linux) this.exec("xdg-open", url);
    },
    match : function (input) {
        return contains(input, "default");
    }
});

createBrowser("Safari", {
    visit : function (url) {
        this.open("Safari", url);
    },
    supported : function () {
        return this.macos;
    },
    match : function (input) {
        return contains(input, "safari");
    },
    agent : function (input) {
        return contains(input, "safari")
            && !contains(input, "chrome")
            && !contains(input, "iphone");
    }
});

createBrowser("Firefox", {
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
        return contains(input, "firefox");
    },
    agent : function (agent) {
        return contains(agent, "firefox");
    }
});

createBrowser("Chrome", {
    supported : function () {
        return this.macos || this.linux;
    },
    visit : function (url) {
        if (this.macos) this.open("Google\\ Chrome", url);
        if (this.linux) this.exec("google-chrome", url);
    },
    match : function (input) {
        return contains(input, "chrome");
    },
    agent : function (agent) {
        return contains(agent, "chrome");
    }
});

createBrowser("Opera", {
    supported : function () {
        return this.macos; // FIXME
    },
    visit : function (url) {
        if (this.macos) this.open("Opera", url);
    },
    match : function (input) {
        return contains(input, "opera");
    },
    agent : function (agent) {
        return contains(agent, "opera");
    }
});

Browser.canonical = function () {
    var b = new Browser;
    if (b.macos) return "Safari";
    if (b.windows) return "Firefox";
    if (b.linux) return "Firefox";
};

Browser.supported = function () {
    var browsers = [];
    for (var name in Browsers) {
        var supported = Browsers[name].prototype.supported;
        if (supported && supported()) browsers.push(name);
    }
    return browsers;
}

Browser.getPlatform = function(browser) {
    if (browser.indexOf('Windows ') > 0) {
        return 'Win';
    }
    if (browser.indexOf('Macintosh') > 0) {
        return 'Mac';
    }
    if (browser.indexOf('X11') > 0) {
        return 'Linux';
    }
    return 'N/A'
}

Browser.getVersion = function() {
}
//Merged from YUI.ua
Browser.forAgent = function(ua) {
    var os, m, version, name, browser = ua;
    if ((/windows|win32/i).test(ua)) {
        os = 'Windows';
    } else if ((/macintosh/i).test(ua)) {
        os = 'MacOS';
    } else if ((/X11/i).test(ua)) {
        os = 'Linux';
    } else if (/iPad|iPod|iPhone/.test(ua)) {
        m = ua.match(/OS ([^\s]*)/);
        if (m && m[1]) {
            os = 'iOS ' + m[1].replace(/_/g, '.');
        }
    } else if (/webOS/.test(ua)) {
        os = 'Palm WebOS';
    } else if (/ Android/.test(ua)) {
        m = ua.match(/Android ([^\s]*);/);
        if (m && m[1]) {
            os = 'Android ' + m[1];
        }
    }

    m = ua.match(/AppleWebKit\/([^\s]*)/);
    if (m && m[1]) {
        m = ua.match(/Version\/([^\s]*)/);
        if (m && m[1]) {
            version = m[1];
            name = 'Safari';
        }

        m = ua.match(/Chrome\/([^\s]*)/);
        if (m && m[1]) {
            version  = m[1]; // Chrome
            name = 'Chrome';
        }
    }
    m = ua.match(/Opera[\s\/]([^\s]*)/);
    if (m && m[1]) {
        version = m[1];
        name = 'Opera';
    } else {
        m = ua.match(/MSIE\s([^;]*)/);
        if (m && m[1]) {
            version = m[1];
            name = 'Internet Explorer';
        } else { // not opera, webkit, or ie
            m = ua.match(/Gecko\/([^\s]*)/);
            if (m) {
                m = ua.match(/Firefox\/([^\s\)]*)/);
                if (m && m[1]) {
                    version = m[1];
                    name = 'Firefox';
                }
            }
        }
    }
    
    if (name && version && os) {
        browser = name + ' (' + version + ') / ' + os;
    }
    return browser;
};

Browser.forAgentSimple = function (ua) {
    var browser = ua;
    for (var name in Browsers) {
        var agent = Browsers[name].prototype.agent;
        if (agent && agent(ua)) browser = name;
    }
    return browser;
};

exports.Browser = Browser;
exports.Browsers = Browsers;
