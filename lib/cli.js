"use strict";

var nopt = require("nopt");
var tty = require("tty");
var os = require("os");
var meta = require("./package").readPackageSync();

var Hub = require("./hub");
var color = require("./old/color").codes;

var hubClient = require("./client");

var good = "✔";
var bad = "✖";

var isTTY = process.stderr.isTTY;

function error() {
    var args = Array.prototype.slice.apply(arguments);
    console.error.apply(console, args);
}

function panic() {
    var args = Array.prototype.slice.apply(arguments);
    error.apply(panic, args);
    process.exit(1);
}

function puts() {
    var args = Array.prototype.slice.apply(arguments);
    console.log.apply(console, args);
}

function setupProcess() {
    process.on("uncaughtException", function (err) {
        var message;

        if ("string" !== typeof err) {
            err = err.stack;
        }

        if (isTTY) {
            message = [
                color.red(bad + " Whoops!") + " " + err, "",
                "If you believe this is a bug in Yeti, please report it.",
                "    " + color.bold(meta.bugs.url),
                "    Yeti v" + meta.version,
                "    Node.js " + process.version
            ];
        } else {
            message = [
                "Yeti v" + meta.version + " " +
                    "(Node.js " + process.version +
                    ") Error: " + err,
                "Report this bug at " + meta.bugs.url
            ];
        }

        panic(message.join("\n"));
    });
}

function parseArgv(argv) {
    var knownOptions = {
        "server": Boolean,
        "version": Boolean,
        "loglevel": ["info", "debug"],
        "debug": Boolean,
        "port": Number,
        "help" : Boolean
    }, shortHands = {
        "s": ["--server"],
        "p": ["--port"],
        "v": ["--loglevel", "info"],
        "vv": ["--loglevel", "debug"]
    };

    // These should be exports, use a different file.

    return nopt(knownOptions, shortHands, argv);
}

function submitBatch(client, tests, cb) {
    error(good, "Testing started!");

    function displayVerboseResult(result) {
        var lastSuite, k, k1,
            suite, test, msg, m;
        for (k in result) {
            suite = result[k];
            if ("object" === typeof suite) {
                if (suite.failed) {
                    for (k1 in suite) {
                        test = suite[k1];
                        if ("object" === typeof test) {
                            if ("fail" === test.result) {
                                if (!lastSuite || lastSuite !== suite.name) {
                                    error("   in", color.bold(suite.name));
                                    lastSuite = suite.name;
                                }
                                msg = test.message.split("\n");
                                error("    ", color.bold(color.red(test.name)) + ":", msg[0]);
                                for (m = 1; m < msg.length; m++) {
                                    error("       " + msg[m]);
                                }
                            }
                        }
                    }
                }
            }
        }
        error("");
    }

    var batch = client.createBatch({
        basedir: process.cwd(),
        tests: tests
    });

    var timeStart = Number(new Date()),
        batchDetails = {
            passed: 0,
            failed: 0
        };

    batch.on("agentResult", function (session, agent, details) {
        var passed = details.passed,
            failed = details.failed,
            icon = failed ? bad : good,
            iconColor = failed ? color.red : color.green;

        batchDetails.passed += passed;
        batchDetails.failed += failed;

        error(iconColor(icon), color.bold(details.name), "on", agent);

        if (failed) {
            displayVerboseResult(details);
        }
    });

    batch.on("agentScriptError", function (session, agent, details) {
        error(color.red(bad + " Script error") + ": " + details.message);
        error("  URL: " + details.url);
        error("  Line: " + details.line);
        error("  User-Agent: " + agent);
    });

    batch.on("agentComplete", function (session, agent) {
        error(good, "Agent completed:", agent);
    });

    batch.on("complete", function () {
        var duration = Number(new Date()) - timeStart,
            total = batchDetails.passed + batchDetails.failed,
            durationString = "(" + duration + "ms)";

        if (batchDetails.failed) {
            error(color.red("Failures") + ":", batchDetails.failed,
                "of", total, "tests failed.", durationString);
            process.exit(1);
        } else {
            error(color.green(total + " tests passed!"), durationString);
            process.exit(0);
        }
    });
}

function runBatch(options) {
    var files = options.argv.remain,
        hostname = os.hostname(),
        port = options.port || 9000,
        debug = options.debug;

    if (!isTTY) {
        // stderr is not a terminal, we are likely being ran by another program.
        // Fail quickly instead of waiting for browsers.
        throw "Unable to connect to Hub or start an interactive session.";
        // TODO: Allow waiting X seconds for browsers.
        //        "Try running with --wait 30 to wait 30 seconds for browsers to connect.";
    }

    // TODO Connect to a Hub.
    // For now, just create a hub.
    var hub = new Hub({
        loglevel: options.loglevel
    });
    hub.listen(port);

    hub.once("error", function (err) {
        throw err;
    });

    // In this case, nobody is connected yet.
    // If we connected to a server, we would list
    // the current agents.

    process.stdin.resume();
    tty.setRawMode(true);

    process.stdin.on("keypress", function (s, key) {
        if (key.ctrl) {
            switch (key.name) {
                case "c":
                    process.kill(process.pid, "SIGINT");
                    break;
                case "z":
                    process.kill(process.pid, "SIGSTP");
                    break;
            }
        } else if (key.name !== "enter")  {
            error("Press Enter to begin testing, or Ctrl-C to exit.");
        } else {
            tty.setRawMode(false);
            process.stdin.pause();
            submitBatch(client, files);
        }
    });

    var url = "http://localhost:" + port;

    var client = hubClient.connect(url);

    error("Waiting for agents to connect at " + url + ".");
    error("When ready, press Enter to begin testing.");

    client.on("agentConnect", function (session, agent) {
        error("  Agent connected:", agent);
    });

    client.on("agentDisconnect", function (session, agent) {
        error("  Agent disconnected:", agent);
    });

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
        runBatch(options);
    } else if (options.server) {
        startServer(options);
    } else if (options.argv.original[0] === "-v") {
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
