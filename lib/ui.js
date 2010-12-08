var sys = require("sys");

var pkg = require("./package");
var Browser = require("./browsers").Browser;

exports.good = "✔";
exports.bad = "✖";

var color = require("./color").codes;
exports.color = color;

// Controls the output of `debug` messages.
var verbose = false;
exports.verbose = function (bit) {
    verbose = !!bit;
};

// Controls the output of `debug` and `log` messages.
var quiet = false;
exports.quiet = function (bit) {
    quiet = !!bit;
}

// Wrapper for  sys.puts .
exports.puts = sys.puts;

// Smart logging function.
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

// Wrapper for `log` that checks the verbose flag first.
function debug () {
    if (quiet) return;
    if (!verbose) return;
    log.apply(this, arguments);
}

exports.debug = debug;

// Helpers for the summary.

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

// Display test results.
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

// Print a summary of test results then exit.
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

// Exit Yeti. If an `err` is provided, print infomration about it
// and provide bug reporting information.
function exit (err) {
    if (err) {
        log(color.red("Fatal error") + ":", err);

        // We require a specific version of Jade.
        // If you have Homebrew installed, sometimes the global
        // version of Jade is used instead of our version.
        // What's worse, sometimes our dependencies directory
        // isn't even put into `require.paths`! Then nothing works.
        // This happens so often, I wrote this message for it.
        if (process.execPath.indexOf("Cellar/node") !== -1) {
            log();
            log(color.red("Danger, Will Robinson.")
                + " Your Node.js may have been installed by Homebrew.");
            log("npm doesn't work correctly with Homebrew.");
            log("Before reporting a Yeti bug, try reinstalling Node.js without brew.");
            log("    Zero to Node guide: " + color.bold("http://gist.github.com/579814"));
            log("    npm bug: " + color.bold("http://github.com/isaacs/npm/issues/issue/257"));
            log();
        }

        log("If you believe this is a bug in Yeti, please report it:");
        var meta = pkg.readPackageSync();
        log(color.bold("    " + meta.bugs.web));
        log("    or email: " + color.bold(meta.bugs.mail));
        log("    Yeti version: " + meta.version);
        log("    Node.js version: " + process.version);
    }
    process.exit(0);
}

exports.exit = exit;
