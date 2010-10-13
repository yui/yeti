var sys = require("sys");

var pkg = require("./package");
var Browser = require("./browsers").Browser;

exports.good = "✔";
exports.bad = "✖";

var color = require("./color").codes;
exports.color = color;

var verbose = false;
exports.verbose = function (bit) {
    verbose = !!bit;
};

var quiet = false;
exports.quiet = function (bit) {
    quiet = !!bit;
}

exports.puts = sys.puts;

function log (a) {
    if (quiet) return;
    if (typeof a === "undefined") return sys.error("");
    var args = Array.prototype.slice.call(arguments);
    var line = [];
    args.forEach(function (msg) {
        if (msg instanceof Error) msg = msg.stack;
        if (typeof msg !== "string") msg = sys.inspect(msg, 0, 4);
        line.push(msg);
    });
    sys.error(line.join(" "));
};

exports.log = log;

function debug () {
    if (quiet) return;
    if (!verbose) return;
    log.apply(this, arguments);
}

exports.debug = debug;

var startTime = 0;
var pendingResults = 0;

exports.start = function () {
    startTime = new Date().getTime();
};

exports.pending = function () {
    pendingResults++;
};

var everything = {
    passed : 0,
    failed: 0
};

function results (result, verbose) {
    everything.failed += result.failed;
    everything.passed += result.passed;

    var browser = Browser.forAgent(result.ua);

    var icon = result.failed ? exports.bad : exports.good;
    var em = result.failed ? color.red : color.green;
    var fa = result.failed ? color.red : function(str) { return str; };
    log(em(icon) + "  " + color.bold(result.name) + " on " + browser);
    
    var ua = "        (" + result.ua + ")";
    if (browser === result.ua) {
        log(ua);
    } else {
        debug(ua);
    }

    var str = '   ' + result.passed + ' passed',
        str2 = ' ' + result.failed + ' failed';

    if (result.passed) {
        str = color.bold(color.green(str));
    }
    if (result.failed) {
        str2 = color.bold(color.red(str2));
    }
    log(str + ', ' + str2);

    if (result.failed) {
        var lastSuite;
        for (var k in result) {
            var suite = result[k];
            if ("object" === typeof suite) {
                if (suite.failed) {
                    for (var k1 in suite) {
                        var test = suite[k1];
                        if ("object" === typeof test) {
                            if ("fail" === test.result) {
                                if (!lastSuite || lastSuite !== suite.name) {
                                    log("   in", color.bold(suite.name));
                                    lastSuite = suite.name;
                                }
                                var msg = test.message.split('\n');
                                log("    ", color.bold(color.red(test.name)) + ":", msg[0]);
                                for (var m = 1; m < msg.length; m++) {
                                    log("       " + msg[m]);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    log("");

    if (!--pendingResults) summarize();
};

exports.results = results;

function summarize () {
    var duration = new Date().getTime() - startTime;
    var time = " (" + duration + "ms)";

    if (everything.failed) {
        var total = everything.passed + everything.failed;
        log(
            color.red("Failures") + ": "
            + everything.failed + " of " + total
            + " tests failed." + time
        );
        process.exit(1);
    } else {
        log(color.green(everything.passed + " tests passed!") + time);
        process.exit(0);
    }
}

exports.summarize = summarize;

function exit (err) {
    if (err) {
        log(color.red("Fatal error") + ":", err);

        if (process.execPath.indexOf("Cellar/node") !== -1) {
            log();
            log(color.red("Danger, Will Robinson.")
                + " Your Node.js may have been installed by Homebrew.");
            log("NPM doesn't work correctly with Homebrew.");
            log("Before reporting a Yeti bug, try reinstalling Node.js without brew.");
            log("    Zero to Node guide: " + color.bold("http://gist.github.com/579814"));
            log("    NPM bug: " + color.bold("http://github.com/isaacs/npm/issues/issue/257"));
            log();
        }

        log("If you believe this is a bug in Yeti, please report it:");
        var meta = pkg.readPackageSync();
        log(color.bold("    " + meta.bugs.web));
        log("    or email: " + color.bold(meta.bugs.mail));
        log("    Version: " + meta.version);
    }
    process.exit(0);
}

exports.exit = exit;
