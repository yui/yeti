"use strict";

/**
 * @module cli
 */

var nopt = require("nopt");
var Configuration = require("./configuration").Configuration;
var os = require("os");
var path = require("path");
var glob = require("glob");
var url = require("url");
var readline = require("readline");
var util = require("util");
var meta = require("./package").readPackageSync();

var Hub = require("./hub");
var color = require("./color").codes;

var hubClient = require("./client");

var YetiEventEmitter2 = require("./events").EventEmitter2;

var isTTY = process.stderr.isTTY;

var good = "✓";
var bad = "✗";

var processSetupComplete = false;

var parseArgv = exports.parseArgv = function (argv) {
    var knownOptions = {
        "server": Boolean,
        "version": Boolean,
        "loglevel": ["info", "debug"],
        "query": String,
        "debug": Boolean,
        "port": Number,
        "timeout": Number,
        "hub": url,
        "help" : Boolean
    }, shortHands = {
        "s": ["--server"],
        "p": ["--port"],
        "v": ["--loglevel", "info"],
        "vv": ["--loglevel", "debug"]
    },
    parsed,
    booleanParsed;

    parsed = nopt(knownOptions, shortHands, argv);

    // Workaround a nopt bug for `hub` option.
    // Normally we'd want `hub` to be first parsed
    // as a url, then fallback to Boolean.
    //
    // However, if we specify [url, Boolean] as
    // `hub`'s type, nopt will coerce hub aggressively
    // into a Boolean.
    //
    // https://github.com/isaacs/nopt/blob/19736d85ffd3f0eeffc0e8d2ca66c92d0825ebb7/lib/nopt.js#L276

    if (!("hub" in parsed)) {
        // If parsed.hub is undefined, either
        // hub was not specified or was not a URL.
        //
        // Make a second pass of nopt's cooked args.
        // Pass 0 to override the default 2 slice.
        booleanParsed = nopt({
            "hub": Boolean
        }, null, parsed.argv.cooked, 0);

        if ("hub" in booleanParsed) {
            parsed.hub = booleanParsed.hub;
        }
    }

    return parsed;
};

var getLocalIP = exports.getLocalIP = (function () {
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

/**
 * The Yeti command-line interface.
 *
 * @class CLI
 * @constructor
 * @extends YetiEventEmitter2
 * @param {Object} config Configuration.
 * @param {Function} config.exitFn Handler when process exit is requested, 1-arity.
 * @param {Function} config.putsFn Handler for stdout, expando arguments.
 * @param {Function} config.errorFn Handler for stderr, expando arguments.
 * @param {ReadableStream} config.readableStream Readable stream for creating a readline interface.
 * @param {WritableStream} config.writableStream Writable stream for creating a readline interface.
 */
function CLI(config) {
    /**
     * Fires when the process should exit.
     *
     * @property exitFn
     * @type {Function}
     * @param {Number} Return code.
     */
    this.exitFn = config.exitFn;
    /**
     * Fires for a line that should be printed to stdout.
     *
     * @property putsFn
     * @type {Function}
     * @param {String|Object} Multiple arguments.
     */
    this.putsFn = config.putsFn;
    /**
     * Fires for a line that should be printed to stderr.
     *
     * @property errorFn
     * @type {Function}
     * @param {String|Object} Multiple arguments.
     */
    this.errorFn = config.errorFn;

    /**
     * For readline.
     *
     * @property readableStream
     * @type {ReadableStream}
     */
    this.readableStream = config.readableStream;

    /**
     * For readline.
     *
     * @property writableStream
     * @type {WritableStream}
     */
    this.writableStream = config.writableStream;

    this.rl = readline.createInterface(this.readableStream, this.writableStream);
}

util.inherits(CLI, YetiEventEmitter2);

/**
 * Fire the `exit` event with the given code.
 * @method exit
 * @param {Number} Return code.
 * @private
 */
CLI.prototype.exit = function (code) {
    this.exitFn(code);
};

/**
 * Fire the `error` event with the given arguments.
 * @method exit
 * @param {String|Object} Multiple arguments.
 * @private
 */
CLI.prototype.error = function () {
    var args = Array.prototype.slice.apply(arguments);
    // This is not an event because this may called
    // when the event loop is already shut down.
    this.errorFn.apply(this, args);
};


/**
 * Fire the `puts` event with the given arguments.
 * @method puts
 * @param {String|Object} Multiple arguments.
 * @private
 */
CLI.prototype.puts = function () {
    var args = Array.prototype.slice.apply(arguments);
    this.putsFn.apply(this, args);
};

/**
 * Call error with the given arguments, then call exit(1).
 * @method panic
 * @param {String|Object} Multiple arguments.
 * @private
 */
CLI.prototype.panic = function () {
    var args = Array.prototype.slice.apply(arguments);
    this.error.apply(this, args);
    this.exit(1);
};

CLI.prototype.setupExceptionHandler = function () {
    var self = this;

    if (processSetupComplete) {
        return;
    }

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

        self.panic(message.join("\n"));
    });

    processSetupComplete = true;
};


/**
 * @method submitBatch
 * @param {Client} client Connected client.
 * @param {Object} options Options (see `Client.createBatch()`).
 * @param {Function} cb Completion callback.
 */
CLI.prototype.submitBatch = function submitBatch(client, options, cb) {
    var self = this,
        batch = client.createBatch(options),
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
                        self.puts("   in", color.bold(suite.name));
                        lastSuite = suite.name;
                    }
                    msg = test.message.split("\n");
                    self.puts("    ", color.bold(color.red(test.name)) + ":", msg[0]);
                    for (m = 1; m < msg.length; m = m + 1) {
                        self.puts("       " + msg[m]);
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
        self.puts("");
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
        var current = batchDetails.currentIndex,
            total = batchDetails.total,
            percent = current / total * 100,
            tps = (beats * 1000) / ((new Date()).getTime() - timeStart),
            spin = ["/", "|", "\\", "-"],
            spins = spin.length - 1,
            coverage = coverageProgress();

        self.rl.write(null, {
            ctrl: true,
            name: "u"
        });
        self.rl.write("Testing... " +
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
            self.puts(iconColor(icon), color.bold(details.name), "on", agent);
            displayVerboseResult(details);
        }
    });

    batch.on("agentScriptError", function (agent, details) {
        self.puts(color.red(bad + " Script error") + ": " + details.message);
        self.puts("  URL: " + details.url);
        self.puts("  Line: " + details.line);
        self.puts("  User-Agent: " + agent);
    });

    batch.on("agentError", function (agent, details) {
        self.puts(color.red(bad + " Error") + ": " + details.message);
        self.puts("  User-Agent: " + agent);
    });

    batch.on("agentComplete", function (agent) {
        self.puts(good, "Agent completed:", agent);
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
            self.panic(bad, "No browsers connected, exiting.");
        }
        self.puts(good, "Testing started on", agents.join(", "));
        batchDetails.total *= agents.length;
    });

    batch.on("complete", function () {
        updateProgress();
        var duration = Number(new Date()) - timeStart,
            total = batchDetails.passed + batchDetails.failed,
            durationString = "(" + duration + "ms)";

        if (batchDetails.failed) {
            self.puts(color.red("Failures") + ":", batchDetails.failed,
                "of", total, "tests failed.", durationString);
            process.exit(1);
        } else {
            self.puts(color.green(total + " tests passed!"), durationString);
            process.exit(0);
        }
    });
};


CLI.prototype.prepareBatch = function prepareBatch(config, cb) {
    var self = this,
        pattern = config.get("glob"),
        unit = "files";

    if (pattern && !config.get("files")) {
        glob(pattern, function (err, matches) {
            if (matches) {
                config.set("files", matches);

                if (matches.length === 1) {
                    unit = "file";
                }
                self.error("Found", matches.length, unit, "to test.");

                cb(config);
            } else {
                self.panic("Glob pattern", pattern, "matched zero files.");
            }
        });
    } else {
        cb(config);
    }
};

CLI.prototype.resolveFilesToBasedir = function resolveFilesToBasedir(config) {
    var files = config.get("files"),
        basedir = config.get("basedir"),
        cwd = process.cwd(),
        absoluteFiles,
        relativeFiles;

    absoluteFiles = files.map(function (file) {
        return path.resolve(cwd, file);
    });

    relativeFiles = absoluteFiles.map(function (file) {
        return path.relative(basedir, file);
    });

    config.debug("Resolved absoluteFiles:", absoluteFiles,
            "to relativeFiles:", relativeFiles);

    config.set("files", relativeFiles);
};

CLI.prototype.runBatch = function runBatch(options) {

    // XXX put this after var
    this.resolveFilesToBasedir(options);

    var self = this,
        files = options.get("files"),
        port = options.get("port"),
        url = options.get("hub"),
        externalUrl = url,
        query = options.get("query"),
        debug = options.get("debug"),
        batchOptions = {
            basedir: options.get("basedir"),
            query: query,
            timeout: options.get("timeout"),
            tests: files
        };

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
                self.submitBatch(client, batchOptions);
            } else {
                self.error("Waiting for agents to connect at " + externalUrl);
                if (externalUrl !== url) {
                    self.error("...also available locally at " + url);
                }

                self.rl.question("When ready, press Enter to begin testing.\n", function () {
                    self.rl.close();
                    self.readableStream.destroy();
                    self.submitBatch(client, batchOptions);
                });
            }
        });

        client.on("agentConnect", function (agent) {
            self.error("  Agent connected:", agent);
        });

        client.on("agentDisconnect", function (agent) {
            self.error("  Agent disconnected:", agent);
        });
    }

    function createHub() {
        url = "http://localhost:" + port;
        externalUrl = "http://" + getLocalIP() + ":" + port;

        self.error("Creating a Hub. Open `yeti --server` in another " +
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
                self.error(""); // Newline.
                prepareTests(client);
            }
        });
    }

    function connectToURL(url) {
        var client = hubClient.createClient(url);
        client.connect(function (err) {
            if (err) {
                if (options.get("hub")) {
                    self.error("Unable to connect to Hub at", externalUrl,
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
};

CLI.prototype.startServer = function startServer(options) {
    var self = this,
        port = options.get("port"),
        ipAddress = "127.0.0.1",
        hub = new Hub({
            loglevel: options.loglevel
        });

    hub.once("error", function (err) {
        if (err.code === "EADDRINUSE") {
            self.panic("Unable to start the Hub because port %s is in use.", port);
        } else {
            throw err;
        }
    });

    hub.listen(port, function () {
        self.error("Yeti Hub started. LAN: http://%s:%s\n" +
           "                  Local: http://localhost:%s",
            getLocalIP(), port, port);
    });
};

CLI.prototype.route = function (argv) {
    var parsedArgs = parseArgv(argv),
        config = new Configuration(),
        usage = "usage: " + argv[1] +
                " [--version | -v] [--server | -s] [--port=<n>]" +
                " [--hub=<url>] [--loglevel <level>] [--timeout <seconds>]" +
                " [--query <params>] [--basedir <directory>]" +
                " [--help] [--] [<HTML file>...]";

    config.pipeLog(this);

    if (parsedArgs.loglevel) {
        this.printLogEventsForLevel("Yeti CLI", parsedArgs.loglevel);
    }

    // hub nopt type is url, with a Boolean fallback.
    // If we get true, a URL was provided but failed to parse.
    if (parsedArgs.hub === true) {
        this.error("Command-line Hub option does not appear to be a valid URL. Ignoring.");
        delete parsedArgs.hub;
    }

    config.import({
        // Defaults.
        port: 9000,
        host: "127.0.0.1",
        basedir: process.cwd()
    }).setFilename(".yeti.json").home().find().env("YETI_").import(parsedArgs);

    if (parsedArgs.argv.remain.length) {
        config.set("files", parsedArgs.argv.remain);
    }

    if (config.get("files") || config.get("glob")) {
        if (config.get("server")) {
            this.error("Ignoring --server option.");
        }

        this.prepareBatch(config, this.runBatch.bind(this));
    } else if (config.get("server")) {
        this.startServer(config);
    } else if (parsedArgs.version || parsedArgs.argv.original[0] === "-v") {
        this.puts(meta.version);
        this.exit(0);
    } else if (parsedArgs.help) {
        this.puts(usage);
        this.exit(0);
    } else {
        this.panic(
            usage + "\n" +
                "No files specified. " +
                "To launch the Yeti server, specify --server."
        );
    }
};

exports.CLI = CLI;
