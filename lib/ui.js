var sys = require("sys");
var Browsers = require("./browsers").Browsers;

exports.good = "✔";
exports.bad = "✖";

var color = require("./color").codes;
exports.color = color;

var verbose = false;
exports.verbose = function (bit) {
    verbose = !!bit;
};

function log () {
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

    // var browser = Browsers.forAgent(result.ua);

    var icon = result.failed ? exports.bad : exports.good;
    var em = result.failed ? color.red : color.green;
    log(em(icon) + "  " + color.bold(result.name)); // + " on " + browser);
    log("From: " + result.ua);
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
    } else {
        log(color.green(everything.passed + " tests passed!") + time);
    }
    process.exit(0);
}

exports.summarize = summarize;

function exit (err) {
    if (err) {
        log(color.red("Fatal error") +": " + err);
    }
    process.exit(0);
}

exports.exit = exit;
