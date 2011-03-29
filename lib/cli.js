// Refines the config object from
// the string in config.argv.

// We don't read process.argv directly
// so that this function is testable.

var optparse = require("optparse");

function verify (config) {
    // Either files or --server is required.
    if (config.files.length) return;
    if (config.version) return;
    if (!("server" in config)) throw "No files specified."
        + " To launch the Yeti server, specify --server.";
}

exports.configure = function (config) {

    var defaults = config,
        knownOpts = {
            "version" : Boolean,
            "server" : Boolean,
            "port" : Number
        },
        shortHands = {
            "v" : "--version"
        };

    config = optparse(knownOpts, shortHands, config.argv, 0);

    delete defaults.argv;

    config.files = [];

    // Everything else are the files.
    if (config.argv.remain) {
        config.files = config.argv.remain;
    }

    try {
        verify(config);
    } catch (ex) {
        return {
            usage : "usage: " + process.argv[1]
                     + " [--version | -v] [--server] [--port=<n>]"
                     + " [--] [<HTML files>...]",
            error : ex
        };
    }

    delete config.argv;

    // Restore required defaults, if needed.
    Object.keys(defaults).forEach(function (key) {
        if (!(key in config)) config[key] = defaults[key];
    });

    // Current path.
    config.path = process.cwd();

    return config;

};
