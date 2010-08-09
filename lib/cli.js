exports.configure = function (config) {

    if (!config.files) config.files = [];

    // parse argv
    var arg, key;
    while (
        arg = config.argv.shift()
    ) if (
        "--" === arg.substr(0, 2)
    ) {
        if (key) config[key] = true;
        key = arg.substr(2);
    } else if (key) {
        config[key] = arg;
        key = null;
    } else config.files.push(arg);
    if (key) config[key] = true;
    delete config.argv;

    config.port = parseInt(config.port);
    config.path = process.cwd();

    return config;

};
