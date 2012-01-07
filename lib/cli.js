"use strict";

var util = require("util");
var nopt = require("nopt");

var meta = require("./package").readPackageSync();

var Hub = require("./hub");
var color = require("./old/color").codes;

var good = "✔";
var bad = "✖";

function error() {
    var args = Array.prototype.slice.apply(arguments);
    util.error.apply(util, args);
}

function panic() {
    var args = Array.prototype.slice.apply(arguments);
    error.apply(panic, args);
    process.exit(1);
}

function puts() {
    var args = Array.prototype.slice.apply(arguments);
    util.puts.apply(util, args);
}

function setupProcess() {
    process.on("uncaughtException", function (err) {
        if ("string" !== typeof err) {
            err = err.stack;
        }

        panic([
            color.red(bad + " Fatal error") + ": " + err, "",
            "If you believe this is a bug in Yeti, please report it.",
            "    " + color.bold(meta.bugs.url),
            "    Yeti v" + meta.version,
            "    Node.js " + process.version
        ].join("\n"));
    });
}

function parseArgv(argv) {
    var knownOptions = {
        "server": Boolean,
        "version": Boolean,
        "debug": Boolean,
        "port": Number,
        "help" : Boolean
    }, shortHands = {
        "s": ["--server"],
        "d": ["--debug"],
        "p": ["--port"],
        "v": ["--version"]
    };

    // These should be exports, use a different file.

    return nopt(knownOptions, shortHands, argv);
}

function runBatch(files) {
    error("Looks like you'd like to run some files: " + files.join(", "));
    error("Not implemented yet.");

    // One of two things will happen RIGHT NOW
    //
    // We will try to connect to a Hub on options.host and options.port
    // (or options.url?) -- default localhost 8090...
    //
    // If that succeeds, we will submit a batch to that
    // Hub, via HTTP, then use the created ID returned
    // to begin a socket.io session with the Hub to listen
    // for test data.
    //
    // If that fails, we will create a Hub in this
    // proess and submit a batch to that using the Hub API.
    //
    // We then will directly subscribe to the Hub's Batch events.
    //
    // VERY IMPORTANT: In both modes, we begin testing IMMEDIATELY
    // unless no browsers are connected to the Hub.
    //
    // If no browsers are connected, we will create a batch
    // but will intrepret the response's data to determine
    // if we need to wait. This may be a 5xx code.
    //
    // If we need to wait, we will subscribe
    // to a different socket.io namespace / local event that
    // notifies us what browsers are connected for the batch.
    //
    // When we press Enter, we will send the batch request again.
    //
    // NOTE: For this version, we will use all available browsers
    // connected to the Hub.
}

function startServer(options) {
    var server = new Hub({
        log: {
            console: {
                silent: !options.debug
            }
        }
    });
    server.listen(8090, function () {
        error("Yeti Hub listening on port 8090.");
    });
}

exports.route = function (argv) {
    setupProcess();

    var options = parseArgv(argv),
        usage = "usage: " + argv[1] +
                " [--version | -v] [--server | -s] [--port=<n>]" +
                " [--help] [--] [<HTML files>]";

    if (options.argv.remain.length) {
        if (options.server) {
            error("Ignoring --server option.");
        }
        runBatch(options.argv.remain);
    } else if (options.server) {
        startServer(options);
    } else if (options.version) {
        puts(meta.version);
    } else if (options.help) {
        puts(usage);
    } else {
        panic(
            usage + "\n" +
                "No files specified. " +
                "To launch the Yeti server, specify --server."
        );
    }
};
