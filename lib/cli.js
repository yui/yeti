"use strict";

var nopt = require("nopt");
var readline = require("readline");
var meta = require("./package").readPackageSync();

var Hub = require("./hub");
var color = require("./color").codes;

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

        if ("string" !== typeof err && err.stack) {
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
        "hub": String,
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
        var lastSuite, k, k1, k2, test2,
            suite, test, //Note comma
            reportTestError = function (test) {
                var msg, m;

                if ("fail" === test.result) {
                    if (!lastSuite || lastSuite !== suite.name) {
                        error("   in", color.bold(suite.name));
                        lastSuite = suite.name;
                    }
                    msg = test.message.split("\n");
                    error("    ", color.bold(color.red(test.name)) + ":", msg[0]);
                    for (m = 1; m < msg.length; m = m + 1) {
                        error("       " + msg[m]);
                    }
                }
            },
            hasResults = function (o) {
                return (('passed' in test) && ('failed' in test) && ('type' in test));
            },
            walk = function (o) {
                var i;
                for (i in o) {
                    if (hasResults(o[i])) {
                        reportTestError(o[i]);
                    } else {
                        walk(o[i]);
                    }
                }
            };


        for (k in result) {
            suite = result[k];
            if ("object" === typeof suite) {
                if (suite.failed) {
                    for (k1 in suite) {
                        test = suite[k1];
                        if ("object" === typeof test) {
                            if (hasResults(test)) {
                                walk(test);
                            } else {
                                reportTestError(test);
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
        }),
        timeStart = Number(new Date()),
        batchDetails = {
            passed: 0,
            failed: 0
        };

    batch.on("agentResult", function (agent, details) {
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

    batch.on("agentScriptError", function (agent, details) {
        error(color.red(bad + " Script error") + ": " + details.message);
        error("  URL: " + details.url);
        error("  Line: " + details.line);
        error("  User-Agent: " + agent);
    });

    batch.on("agentError", function (agent, details) {
        error(color.red(bad + " Error") + ": " + details.message);
        error("  User-Agent: " + agent);
    });

    batch.on("agentComplete", function (agent) {
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
        port = options.port || 9000,
        url = options.hub,
        debug = options.debug;

    function prepareTests(client) {
        // In this case, nobody is connected yet.
        // If we connected to a server, we would list
        // the current agents.

        client.getAgents(function (err, agents) {
            if (err) {
                throw err;
            }

            agents.forEach(function (agent) {
                client.emit("agentConnect", agent);
            });

            if (agents.length > 0) {
                submitBatch(client, files);
            } else {
                if (!isTTY) {
                    // TODO Only throw this error if no agents are immediately available.
                    // stderr is not a terminal, we are likely being ran by another program.
                    // Fail quickly instead of waiting for browsers.
                    throw "Unable to connect to Hub or start an interactive session.";
                    // TODO: Allow waiting X seconds for browsers.
                    //        "Try running with --wait 30 to wait 30 seconds for browsers to connect.";
                }

                var rl = readline.createInterface(process.stdin, process.stderr);

                error("Waiting for agents to connect at " + url + ".");

                rl.question("When ready, press Enter to begin testing.\n", function () {
                    rl.close();
                    process.stdin.destroy();
                    submitBatch(client, files);
                });
            }
        });

        client.on("agentConnect", function (agent) {
            error("  Agent connected:", agent);
        });

        client.on("agentDisconnect", function (agent) {
            error("  Agent disconnected:", agent);
        });
    }

    function createHub() {
        url = "http://localhost:" + port;

        error("Creating a Hub at " + url);

        var client,
            hub = new Hub({
                loglevel: options.loglevel
            });

        hub.listen(port);

        hub.once("error", function (err) {
            throw err;
        });

        client = hubClient.createClient(url);

        client.connect(function (err) {
            if (err) {
                throw err;
            } else {
                prepareTests(client);
            }
        });
    }

    function connectToURL(url) {
        var client = hubClient.createClient(url);
        client.connect(function (err) {
            if (err) {
                createHub();
            } else {
                error("Connected to " + url);
                prepareTests(client);
            }
        });
    }

    if (!url) {
        url = "http://localhost:9000";
    }

    connectToURL(url);
}

function startServer(options) {
    var port = options.port || 9000,
        hub = new Hub({
            loglevel: options.loglevel
        });

    hub.once("error", function (err) {
        if (err.code === "EADDRINUSE") {
            panic("Unable to start the Hub because port %s is in use.", port);
        } else {
            throw err;
        }
    });

    hub.listen(port, function () {
        error("Yeti Hub listening on port %s.", port);
    });
}

exports.route = function (argv) {
    setupProcess();

    var options = parseArgv(argv),
        usage = "usage: " + argv[1] +
                " [--version | -v] [--server | -s] [--port=<n>]" +
                " [--hub=<url>]" +
                " [--help] [--] [<HTML files>]";

    if (options.argv.remain.length) {
        if (options.server) {
            error("Ignoring --server option.");
        }
        runBatch(options);
    } else if (options.server) {
        startServer(options);
    } else if (options.version || options.argv.original[0] === "-v") {
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
