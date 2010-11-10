var ui = require("./ui");
var visitor = require("./visitor");
var server = require("./server");
var http = require("./http");
var pkg = require("./package");

// Nicely format fatal errors with ui.exit.
process.on("uncaughtException", function (e) {
    ui.exit(e);
});

// The entrypoint of Yeti.
exports.boot = function (config) {

    if (config.version) {
        var ver;
        try {
            ver = pkg.readPackageSync().version;
        } catch (ex) {
            ver = "unknown";
        }
        ui.puts(ver);
        process.exit(0);
    }

    // Set a flag for ui to print debug() messages.
    ui.verbose(config.verbose);

    // Was `--browsers` provided on the command line?
    config.forceVisit = !!config.browsers;

    // Provide an appropiate browser if one wasn't given.
    if (
        "string" !== typeof config.browsers
    ) config.browsers = require("./browsers").Browser.canonical();

    config.browsers = config.browsers.split(",");

    // Suppress debug() and log() ui messages.
    if (config.quiet) ui.quiet(config.quiet);

    // Assume the Yeti server is on the same computer.
    if (!config.host) config.host = "localhost";

    // Configuration is done.
    fromConfiguration(config);

};

function fromConfiguration (config) {

    // If no files were provided, we're probably
    // starting up the Yeti server.
    if (!config.files.length) {
        try {
            server.fromConfiguration(config);
        } catch (e) {
            // Don't fallback to `uncaughtException`, show a helpful message:
            ui.log(e);
            ui.exit("Unable to start the server. Is it already running?");
        }
        return;
    }

    // Attempt to add our test files.

    var d = {
        host : config.host,
        port : config.port
    };

    d.method = "PUT";
    d.path = "/tests/add";
    d.body = { tests : visitor.composeURLs(
        "",
        config.path,
        config.files
    ) };
    var req = http.request(d);

    if (config.solo) {
        ui.start();
        var l = config.files.length;
        while (l--) ui.pending();
    }

    req.on("response", function (res, id) {
        ui.log("Waiting for results. When you're done, hit Ctrl-C to exit.");
        ui.debug("Batch registered:", id);
        d.method = "GET";
        d.path = "/status/" + id;

        // Keep requesting test results forever.
        (function moreResults () {

            http.request(d).on("response", function X (res, result) {
                if (res.statusCode === 200) {
                    ui.results(result);
                    moreResults();
                } else if (!d._404 && res.statusCode === 404) {
                    // Perhaps the client hasn't connected yet?
                    d._404 = true;
                    return setTimeout(function () {
                        http.request(d).on("response", X);
                    }, 500);
                } else {
                    ui.exit("The server says: " + result);
                }
            });

        })();

    });

    // Couldn't add the tests. Continue in standalone mode.
    req.on("error", function () {
        server.fromConfiguration(config);
    });
}

exports.fromConfiguration = fromConfiguration;
