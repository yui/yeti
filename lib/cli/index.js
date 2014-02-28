"use strict";

/**
 * @module cli
 */

var nopt = require("nopt");
var Configuration = require("./configuration");
var path = require("path");
var glob = require("glob");
var urlUtil = require("url");
var util = require("util");
var url = require("url");
var meta = require("../package-metadata").readPackageSync();

var Hub = require("../hub");
var color = require("./color").codes;

var FeedbackLineReporter = require("./reporter/feedback-line");
var JUnitReporter = require("./reporter/junit");
var CoverageReporter = require("./reporter/coverage");

var EventEmitter2 = require("../event-emitter");
var EventYoshi = require("eventyoshi");

var hubClient = require("../client");

var getLocalIP = require("../local-ip");
var parseBrowsers = require("./parse-browsers");
var parseCaps = require("./parse-caps");

var Console = require("./console");

var good = "✓";
var bad = "✗";

var processSetupComplete = false;

var parseArgv = exports.parseArgv = function (argv) {
    var knownOptions = {
        "name": String,
        "self-url": url,
        "wd-url": url,
        "wd-host": String, // 0.2.x back-compat
        "wd-port": Number, // 0.2.x back-compat
        "browser": [String, Array],
        "caps": [String, Array],
        "output": ["junit", "feedback"],
        "server": Boolean,
        "version": Boolean,
        "coverage": Boolean,
        "coverage-report": String,
        "coverage-dir": String,
        "instrument-exclude": [String, Array],
        "instrument": Boolean,
        "loglevel": ["info", "debug"],
        "query": String,
        "debug": Boolean,
        "port": Number,
        "timeout": Number,
        "hub": url,
        "help" : Boolean
    }, shortHands = {
        "b": ["--browser"],
        "junit": ["--output", "junit"],
        "c": ["--coverage"],
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

/**
 * The Yeti command-line interface.
 *
 * @class CLI
 * @constructor
 * @extends Console
 * @param {Object} config Configuration.
 * @param {Function} config.exitFn Handler when process exit is requested, 1-arity.
 * @param {ReadableStream} config.stdin  Readable stream for creating a readline interface.
 * @param {WritableStream} config.stdout Writable stream for creating a readline interface.
 * @param {WritableStream} config.stderr Writable stream for creating a readline interface.
 * @param {process} config.process Process object for setting up exception handlers.
 */
function CLI(config) {
    Console.call(this, config);

    /**
     * Called when the process should exit.
     *
     * @property exitFn
     * @type {Function}
     * @param {Number} Return code.
     */
    this.exitFn = config.exitFn;

    /**
     * For exception handler.
     *
     * @property process
     * @type {process}
     */
    this.process = config.process;

    this.reporterEmitter = new EventYoshi();
    this.requestedExitCodes = [];

    this.bindReporterEmitterEvents();
}

util.inherits(CLI, Console);

/**
 * Call the exitFn.
 * @method exit
 * @param {Number} Return code.
 * @protected
 */
CLI.prototype.exit = function (code) {
    this.exitFn(code);
};

/**
 * Call error with the given arguments, then call exit(1).
 * @method panic
 * @param {String|Object} Multiple arguments.
 * @protected
 */
CLI.prototype.panic = function (code) {
    var args = Array.prototype.slice.apply(arguments);
    this.error.apply(this, args);
    this.exitFn(1);
};

/**
 * Exit if all reporters have completed.
 *
 * @method exitIfComplete
 * @private
 */
CLI.prototype.exitIfComplete = function () {
    if (this.reporterEmitter.children.length === 0) {
        this.exit(this.requestedExitCodes.sort(function (a, b) {
            return a - b;
        }).reverse().reduce(function (prev, next) {
            if (prev !== 1 && next > 0) {
                return next;
            }
            return prev;
        }));
    }
};

/**
 * @method bindReporterEmitterEvents
 * @private
 */
CLI.prototype.bindReporterEmitterEvents = function () {
    var self = this;

    self.reporterEmitter.proxy("bindEvents");
    self.reporterEmitter.on("end", function (code) {
        self.requestedExitCodes.push(code);
        self.reporterEmitter.remove(this.child);
        self.exitIfComplete();
    });
    self.reporterEmitter.on("error", function () {
        self.exit(1);
    });
};

CLI.prototype.setupExceptionHandler = function () {
    var self = this;

    if (processSetupComplete) {
        return;
    }

    self.process.on("uncaughtException", function (err) {
        var message;

        if ("string" !== typeof err && err.stack) {
            err = err.stack;
        }

        if (self.stderr.isTTY) {
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

function getWebDriverConfigurationFromOptions(options) {
    var url = urlUtil.parse(options.get("wd-url") || ""),
        segments,
        user,
        pass;

    // wd-host, wd-port, wd-user, wd-pass are 0.2.x back-compat options

    if (!url.hostname) {
        url.hostname = options.get("wd-host");
    }
    if (!url.port) {
        url.port = options.get("wd-port");
    }
    if (url.auth) {
        segments = url.auth.split(":");
        user = segments[0];
        pass = segments[1];
    }
    if (!user) {
        user = options.get("wd-user");
    }
    if (!pass) {
        pass = options.get("wd-pass");
    }
    return {
        host: url.hostname,
        port: url.port,
        user: user,
        pass: pass
    };
}

CLI.prototype.createHub = function createHub(options) {
    return new Hub({
        loglevel: options.get("loglevel"),
        selfUrl: options.get("self-url"),
        webdriver: getWebDriverConfigurationFromOptions(options)
    });
};

function createReporterForBatch(Reporter, batch, console, options) {
    return new Reporter({
        cli: console,
        options: options,
        batch: batch
    });
}

function createStderrStatusReporter(cli, batch, options) {
    var console = new Console({
        stdin: cli.stdin,
        stdout: cli.stderr,
        stderr: cli.stderr
    });

    return createReporterForBatch(FeedbackLineReporter, batch, console, options);
}

function createStderrCoverageReporter(cli, batch, options) {
    var console = new Console({
        stdin: cli.stdin,
        stdout: cli.stderr,
        stderr: cli.stderr
    });

    return CoverageReporter.create({
        cli: console,
        options: options,
        batch: batch
    });
}

/**
 * @method submitBatch
 * @param {Client} client Connected client.
 * @param {String} output Reporter output. "junit" selects the JUnitReporter,
 * all others FeedbackLineReporter.
 * @param {Object} options Options (see `Client.createBatch()`).
 * @param {Function} cb Completion callback.
 */
CLI.prototype.submitBatch = function submitBatch(client, options, clientOptions, cb) {
    var batch = client.createBatch(clientOptions),
        output = options.get("output"),
        reporter = FeedbackLineReporter;

    if (output === "junit") {
        reporter = JUnitReporter;
        this.reporterEmitter.add(createStderrStatusReporter(this, batch, options));
    }

    if (options.get("coverage")) {
        this.reporterEmitter.add(createStderrCoverageReporter(this, batch, options));
    }

    this.reporterEmitter.add(createReporterForBatch(reporter, batch, this, options));

    this.reporterEmitter.bindEvents();
};

CLI.prototype.prepareBatch = function prepareBatch(config, cb) {
    var self = this,
        instrumentExcludes = config.get("instrument-exclude"),
        pattern = config.get("glob"),
        unit = "files";

    if (config.get("coverage") && instrumentExcludes) {
        self.error("Skipping coverage instrumentation for files matching " +
            instrumentExcludes.join(", "));
    }

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

// Used only by runBatch.
function resolveFilesToBasedir(config) {
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
}

CLI.prototype.runBatch = function runBatch(options) {

    // XXX put this after var
    resolveFilesToBasedir(options);

    var self = this,
        webdriver = getWebDriverConfigurationFromOptions(options),
        files = options.get("files"),
        browsers = options.get("browser"),
        caps = options.get("caps"),
        port = options.get("port"),
        url = options.get("hub"),
        externalUrl = url,
        query = options.get("query"),
        debug = options.get("debug"),
        instrument = options.get("instrument"),
        batchOptions = {
            instrument: (undefined === instrument) ?
                options.get("coverage") :
                instrument,
            coverageExcludes: options.get("instrument-exclude"),
            basedir: options.get("basedir"),
            query: query,
            timeout: options.get("timeout"),
            tests: files
        };

    if (!browsers) {
        browsers = [];
    } else {
        self.error(
            "The --browser option is deprecated and will be removed in Yeti 0.3.x." +
            " Please use --caps instead."
        );
    }

    browsers = browsers.concat(caps);

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

            if (agents.length === 0 && browsers.length === 0) {
                self.error("Waiting for agents to connect at " + externalUrl);
                if (externalUrl !== url) {
                    self.error("...also available locally at " + url);
                }

                self.rl.question("When ready, press Enter to begin testing.\n", function () {
                    self.rl.close();
                    self.stdin.pause();
                    self.submitBatch(client, options, batchOptions);
                });
            } else {
                if (browsers.length) {
                    self.error("Waiting for Hub to launch browsers...");
                    batchOptions.launchBrowsers = browsers;
                    batchOptions.webdriver = webdriver;
                }
                self.submitBatch(client, options, batchOptions);
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
            hub = self.createHub(options);

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
        url = "http://localhost:" + port;
        externalUrl = "http://" + getLocalIP() + ":" + port;
    }

    connectToURL(url);
};

CLI.prototype.startServer = function startServer(options) {
    var self = this,
        port = options.get("port"),
        ipAddress = "127.0.0.1",
        hub = self.createHub(options);

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
    var defaults = {},
        parsedArgs = parseArgv(argv),
        config = new Configuration(),
        usage = "usage: " + argv[1] +
                " [--version | -v] [--junit] [--server | -s] [--port <n>]" +
                " [--coverage | -c] [--no-instrument] [--coverage-report <type>]" +
                " [--coverage-dir <report-dir>] [--instrument-exclude <glob>...]" +
                " [--hub <url>] [--loglevel <level>] [--timeout <seconds>]" +
                " [--query <params>] [--basedir <dir>] [--caps <capabilities>...]" +
                " [--wd-url <url>] [--self-url <url>]" +
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

    defaults.port = 9000;
    defaults.host = "127.0.0.1";
    defaults.basedir = process.cwd();
    defaults["coverage-report"] = "summary";
    defaults["coverage-dir"] = "./coverage";

    config.import(defaults).setFilename(".yeti.json").home().find().env("YETI_").import(parsedArgs);

    if (parsedArgs.argv.remain.length) {
        config.set("files", parsedArgs.argv.remain);
    }

    if (config.get("coverage") && typeof config.get("coverageOptions") === "object") {
        config.import(config.get("coverageOptions"));
    }

    if (parsedArgs.version || parsedArgs.argv.original[0] === "-v") {
        this.puts(meta.version);
        this.exit(0);
    } else if (parsedArgs.help) {
        this.puts(usage);
        this.exit(0);
    } else if (config.get("server")) {
        if (config.get("files")) {
            this.error("Ignoring files, only starting the server.");
        }
        this.startServer(config);
    } else if (config.get("files") || config.get("glob")) {
        try {
            config.set("browser", parseBrowsers(config.get("browser")));
        } catch (ex) {
            return this.panic("Unable to parse browsers option: " + ex.message);
        }
        config.set("caps", parseCaps(config.get("caps")));
        this.prepareBatch(config, this.runBatch.bind(this));
    } else {
        this.panic(
            usage + "\n" +
                "No files specified. " +
                "To launch the Yeti server, specify --server."
        );
    }
};

exports.CLI = CLI;
