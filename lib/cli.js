exports.configure = function (config) {

    if (!config.files) config.files = [];

    // parse argv
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
