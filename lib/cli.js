// Refines the config object from
// the string in config.argv.

// We don't read process.argv directly
// so that this function is testable.

exports.configure = function (config) {

    if (!config.files) config.files = [];

    // Parse config.argv.
    var arg, key, two;
    while (
        arg = config.argv.shift()
    ) {
        two = arg.substr(0, 2)
        if (
            "--" === two
        ) {
            if (key) config[key] = true;
            key = arg.substr(2);
        } else if (key) {
            config[key] = arg;
            key = null;
        // Provide an exception for `-v`.
        } else if ("-v" === two) {
            config.version = true;
            key = null;
        } else config.files.push(arg);
    }
    if (key) config[key] = true;
    delete config.argv;

    config.port = parseInt(config.port);
    config.path = process.cwd();

    return config;

};
