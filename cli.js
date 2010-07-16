#!/usr/bin/env node

var sys = require("sys");

function log (msg) {
    console.log("yeti: " + msg);
}

function exit (msg) {
    log(msg);
    process.exit(1);
}

function main (config) {
    if (
        !config.files.length
    ) exit("At least one testfile is required. Hint: you can specify many!");

    var path = [];
    for (
        var part, root = config.cwd.split("/");
        part != "src" && root.length;
        part = root.pop(), path.unshift(part)
    );

    config.root = root.join("/");
    config.path = path.join("/");

    if (
        !config.root
    ) exit("You must be inside the YUI src directory.");

    require("./server").boot(config);
}

main({
    port : parseInt(process.env.PORT) || 8000,
    files : process.argv.slice(2),
    cwd : process.cwd()
});
