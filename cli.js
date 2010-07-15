#!/usr/bin/env node

var sys = require("sys");

function log (msg) {
    console.log("ytest: " + msg);
}

function exit (msg) {
    log(msg);
    process.exit(1);
}

function main (config) {
    for (
        var part, path = config.cwd.split("/");
        part != "src" && path.length;
        part = path.pop()
    );

    config.path = path.join("/");

    if (!config.path) exit("Couldn't find a suitable root.");

    require("./server").boot(config);
}

main({
    files : process.argv.slice(1),
    cwd : process.cwd()
});
