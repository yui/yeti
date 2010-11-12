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

exports.configure = function (config) {

    var defaults = config;

    config = optimist.parse(config.argv);

    delete defaults.argv;

    // Everything else are the files.
    if (config._) {
        config.files = config._;
        delete config._;
    }

    // Expand short options.
    config = expand(config, {
        "version" : "v"
    });

    // Restore required defaults, if needed.
    Object.keys(defaults).forEach(function (key) {
        if (!(key in config)) config[key] = defaults[key];
    });

    // Normalize etc.

    config.port = parseInt(config.port);
    config.path = process.cwd();

    return config;

};
