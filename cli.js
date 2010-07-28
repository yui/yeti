#!/usr/bin/env node

var ui = require("./lib/ui");

function mandatory (ok, msg) {
    if (ok) return;
    ui.log(ui.color.red("Error") + ": " + msg);
    process.exit(1);
}

function main (config) {
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
    config.root = "/";
    config.path = process.cwd().substr(1);

    require("./lib/app").boot(config);
}

if (process.argv[1].match(/yeti|cli\.js/)) {
    main({
        port : 8000,
        argv : process.argv.slice(2)
    });
} else {
    exports.main = main;
}
