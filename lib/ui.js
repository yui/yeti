var sys = require("sys");
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

function log (a) {
    if (quiet) return;
    if (typeof a === "undefined") return sys.error("");
    var args = Array.prototype.slice.call(arguments);
    var line = [color.bold(color.blue("yeti"))];
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

function results (result) {
    everything.failed += result.failed;
    everything.passed += result.passed;

    var browser = Browser.forAgent(result.ua);

    if (result.ua !== browser) {
        browser += " (" + result.ua + ")";
    }

    var icon = result.failed ? exports.bad : exports.good;
    var em = result.failed ? color.red : color.green;
    log(em(icon) + "  " + color.bold(result.name) + " on " + browser);
    log("  " + result.passed + " passed");
    log("  " + result.failed + " failed");

    if (result.failed) {
        for (var k in result) {
            var suite = result[k];
            if ("object" === typeof suite) {
                if (suite.failed) {
                    for (var k1 in suite) {
                        var test = suite[k1];
                        if ("object" === typeof test) {
                            if ("fail" === test.result) {
                                log("  in", color.bold(suite.name));
                                log("    ", color.bold(color.red(test.name)), test.message);
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
        log("If you believe this is a bug in Yeti, please report it:");
        log(color.bold("    http://yuilibrary.com/projects/yeti"));
    }
    process.exit(0);
}

exports.exit = exit;
