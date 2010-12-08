// Refines the config object from
// the string in config.argv.

// We don't read process.argv directly
// so that this function is testable.

var optimist = require("optimist");

function expand (config, shorts) {
    Object.keys(shorts).forEach(function (key) {
        if (config[shorts[key]]) config[key] = config[shorts[key]];
        delete config[shorts[key]];
    });
    return config;
}

function verify (argv) {
    // Either files or --server is required.
    if (argv._.length) return;
    if (argv.version) return;
    if (!("server" in argv)) throw "No files specified."
        + " To launch the Yeti server, specify --server.";
}

exports.configure = function (config) {

    var defaults = config;

    config = optimist.parse(config.argv);

    // Expand short options.
    config = expand(config, {
        "version" : "v"
    });

    try {
        verify(config);
    } catch (ex) {
        return {
            usage : "usage: " + config.$0
                     + " [--version | -v] [--server] [--port=<n>]"
                     + " [--] [<HTML files>...]",
            error : ex
        };
    }

    delete defaults.argv;

    // Everything else are the files.
    if (config._) {
        config.files = config._;
        delete config._;
    }

    // Restore required defaults, if needed.
    Object.keys(defaults).forEach(function (key) {
        if (!(key in config)) config[key] = defaults[key];
    });

    // Normalize etc.

    config.port = parseInt(config.port);
    config.path = process.cwd();

    return config;

};
