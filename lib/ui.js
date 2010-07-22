var sys = require("sys");
var Browsers = require("./browsers").Browsers;

exports.good = "✔";
exports.bad = "✖";

exports.color = require("./color").codes;

exports.log = function () {
    var args = Array.prototype.slice.call(arguments);
    var line = [];
    args.forEach(function (msg) {
        if (msg instanceof Error) msg = msg.stack;
        if (typeof msg !== "string") msg = sys.inspect(msg, 0, 4);
        line.push(msg);
    });
    sys.error(line.join(" "));
};

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

exports.results = function (result) {
    everything.failed += result.failed;
    everything.passed += result.passed;

    var browser = Browsers.forAgent(result.ua);

    var icon = result.failed ? exports.bad : exports.good;
    var color = result.failed ? exports.color.red : exports.color.green;
    exports.log(color(icon) + "  " + exports.color.bold(result.name) + " on " + browser);
    exports.log("  " + result.passed + " passed");
    exports.log("  " + result.failed + " failed");

    if (!--pendingResults) summarize();
};

function summarize () {
    var duration = new Date().getTime() - startTime;
    var time = " (" + duration + "ms)";
    exports.log("");
    if (everything.failed) {
        var total = everything.passed + everything.failed;
        exports.log(
            exports.color.red("Failures") + ": "
            + everything.failed + " of " + total
            + " tests failed." + time
        );
    } else {
        exports.log(exports.color.green(everything.passed + " tests passed!") + time);
    }
    // process.exit(0);
}


