"use strict";

var nopt = require("nopt");
var Configuration = require("./configuration").Configuration;
var os = require("os");
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
        "query": String,
        "debug": Boolean,
        "port": Number,
        "timeout": Number,
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

/**
 * @method submitBatch
 * @param {Client} client Connected client.
 * @param {Object} options Options (see `Client.createBatch()`).
 * @param {Function} cb Completion callback.
 */
function submitBatch(client, options, cb) {
    var batch = client.createBatch(options),
        timeStart = Number(new Date()),
        beats = 0,
        spinIndex = 0,
        batchDetails = {
            passed: 0,
            failed: 0,
            currentIndex: 0,
            coverage: [],
            calledLines: 0,
            coveredLines: 0,
            total: options.tests.length
        };

    function displayVerboseResult(result) {
        var lastSuite, k, k1, k2, test2,
            suite, test, //Note comma
            reportTestError = function (test) {
                var msg, m;

                if ("fail" === test.result) {
                    if (!lastSuite || lastSuite !== suite.name) {
                        puts("   in", color.bold(suite.name));
                        lastSuite = suite.name;
                    }
                    msg = test.message.split("\n");
                    puts("    ", color.bold(color.red(test.name)) + ":", msg[0]);
                    for (m = 1; m < msg.length; m = m + 1) {
                        puts("       " + msg[m]);
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
            if (suite && "object" === typeof suite) {
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
        puts("");
    }

    function coverageProgress() {
        var report = "",
            percent;

        batchDetails.coverage.forEach(function (result) {
            Object.keys(result).forEach(function (file) {
                var data = result[file];
                batchDetails.calledLines += data.calledLines;
                batchDetails.coveredLines += data.coveredLines;
            });
        });

        if (batchDetails.calledLines > 0) {
            percent = batchDetails.calledLines / batchDetails.coveredLines * 100;
            report = percent.toFixed(0) + "% line coverage ";
        }

        return report;
    }

    function updateProgress() {
        var s = process.stderr,
            current = batchDetails.currentIndex,
            total = batchDetails.total,
            percent = current / total * 100,
            tps = (beats * 1000) / ((new Date()).getTime() - timeStart),
            spin = ["/", "|", "\\", "-"],
            spins = spin.length - 1,
            coverage = coverageProgress();

        s.write("\r\u001B[2K");
        s.write("Testing... " +
                spin[spinIndex] +
                " " + percent.toFixed(0) +
                "% complete (" + current + "/" +
                total + ") " +
                tps.toFixed(2) + " tests/sec " +
                coverage
            );

        spinIndex += 1;
        if (spinIndex > spins) {
            spinIndex = 0;
        }
    }

    batch.on("agentResult", function (agent, details) {
        var passed = details.passed,
            failed = details.failed,
            icon = failed ? bad : good,
            iconColor = failed ? color.red : color.green;

        batchDetails.currentIndex += 1;

        batchDetails.passed += passed;
        batchDetails.failed += failed;

        if (details.coverage) {
            batchDetails.coverage.push(details.coverage);
            updateProgress();
        }

        if (failed) {
            puts(iconColor(icon), color.bold(details.name), "on", agent);
            displayVerboseResult(details);
        }
    });

    batch.on("agentScriptError", function (agent, details) {
        puts(color.red(bad + " Script error") + ": " + details.message);
        puts("  URL: " + details.url);
        puts("  Line: " + details.line);
        puts("  User-Agent: " + agent);
    });

    batch.on("agentError", function (agent, details) {
        puts(color.red(bad + " Error") + ": " + details.message);
        puts("  User-Agent: " + agent);
    });

    batch.on("agentComplete", function (agent) {
        puts(good, "Agent completed:", agent);
    });

    batch.on("agentProgress", function (agent, details) {
        updateProgress();
    });

    batch.on("agentBeat", function (agent) {
        beats += 1;
        updateProgress();
    });

    batch.on("dispatch", function (agents) {
        if (!agents.length) {
            panic(bad, "No browsers connected, exiting.");
        }
        puts(good, "Testing started on", agents.join(", "));
        batchDetails.total *= agents.length;
    });

    batch.on("complete", function () {
        updateProgress();
        var duration = Number(new Date()) - timeStart,
            total = batchDetails.passed + batchDetails.failed,
            durationString = "(" + duration + "ms)";

        if (batchDetails.failed) {
            puts(color.red("Failures") + ":", batchDetails.failed,
                "of", total, "tests failed.", durationString);
            process.exit(1);
        } else {
            puts(color.green(total + " tests passed!"), durationString);
            process.exit(0);
        }
    });
}

var getLocalIP = (function () {
    var cachedIP;

    function queryLocalIP() {
        var name,
            localIP,
            addresses,
            interfaces = os.networkInterfaces(),
            interfaceNames = Object.keys(interfaces);

        function internalOnly(address) {
            return !address.internal;
        }

        function tryAddresses(address) {
            // Prefer IPv4 addresses.
            if (!localIP || address.family === "IPv4") {
                localIP = address.address;
            }
        }

        do {
            name = interfaceNames.pop();

            // Skip Back to My Mac or VPNs.
            if (name.indexOf("utun") === 0) {
                continue;
            }

            interfaces[name]
                .filter(internalOnly)
                .forEach(tryAddresses);
        } while (interfaceNames.length && !localIP);

        if (!localIP) {
            localIP = "localhost";
        }

        return localIP;
    }

    return function () {
        if (!cachedIP) {
            cachedIP = queryLocalIP();
        }
        return cachedIP;
    };
}());

function runBatch(options) {
    var files = options.get("files"),
        port = options.get("port"),
        url = options.get("hub"),
        externalUrl = url,
        query = options.get("query"),
        debug = options.get("debug"),
        batchOptions = {
            basedir: process.cwd(),
            query: query,
            timeout: options.get("timeout"),
            tests: files
        };

    function prepareTests(client) {
        // In this case, nobody is connected yet.
        // If we connected to a server, we would list
        // the current agents.

        client.getAgents(function (err, agents) {
            var rl;

            if (err) {
                throw err;
            }

            agents.forEach(function (agent) {
                client.emit("agentConnect", agent);
            });

            if (agents.length > 0) {
                submitBatch(client, batchOptions);
            } else {
                rl = readline.createInterface(process.stdin, process.stderr);

                error("Waiting for agents to connect at " + externalUrl);
                if (externalUrl !== url) {
                    error("...also available locally at " + url);
                }

                rl.question("When ready, press Enter to begin testing.\n", function () {
                    rl.close();
                    process.stdin.destroy();
                    submitBatch(client, batchOptions);
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
        externalUrl = "http://" + getLocalIP() + ":" + port;

        error("Creating a Hub. Open `yeti --server` in another " +
                "Terminal to reuse browsers for future batches.");

        var client,
            hub = new Hub({
                loglevel: options.get("loglevel")
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
                error(""); // Newline.
                prepareTests(client);
            }
        });
    }

    function connectToURL(url) {
        var client = hubClient.createClient(url);
        client.connect(function (err) {
            if (err) {
                if (options.get("hub")) {
                    error("Unable to connect to Hub at", externalUrl,
                        "with", err.stack);
                }
                createHub();
            } else {
                prepareTests(client);
            }
        });
    }

    if (!url) {
        url = "http://localhost:9000";
        externalUrl = "http://" + getLocalIP() + ":9000";
    }

    connectToURL(url);
}

function startServer(options) {
    var port = options.get("port"),
        ipAddress = "127.0.0.1",
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
        error("Yeti Hub started. LAN: http://%s:%s\n" +
           "                  Local: http://localhost:%s",
            getLocalIP(), port, port);
    });
}

exports.route = function (argv) {
    setupProcess();

    var parsedArgs = parseArgv(argv),
        config = new Configuration(),
        usage = "usage: " + argv[1] +
                " [--version | -v] [--server | -s] [--port=<n>]" +
                " [--hub=<url>] [--loglevel <level>] [--timeout <seconds>]" +
                " [--query <params>]" +
                " [--help] [--] [<HTML file>...]";

    if (parsedArgs.loglevel) {
        config.printLogEventsForLevel("Yeti Configuration", parsedArgs.loglevel);
    }

    config.import({
        // Defaults.
        port: 9000,
        host: "127.0.0.1"
    }).setFilename(".yeti.json").home().find().env("YETI_").import(parsedArgs);

    if (parsedArgs.argv.remain.length) {
        config.set("files", parsedArgs.argv.remain);
    }

    if (config.get("files")) {
        if (config.get("server")) {
            error("Ignoring --server option.");
        }
        runBatch(config);
    } else if (config.get("server")) {
        startServer(config);
    } else if (parsedArgs.version || parsedArgs.argv.original[0] === "-v") {
        puts(meta.version);
    } else if (parsedArgs.help) {
        puts(usage);
    } else {
        panic(
            usage + "\n" +
                "No files specified. " +
                "To launch the Yeti server, specify --server."
        );
    }
};
