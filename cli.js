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
    var path = [];
    for (
        var part, root = config.cwd.split("/");
        part != "src" && root.length;
        part = root.pop(), path.unshift(part)
    );

    config.root = root.join("/");
    config.path = path.join("/");

    if (!config.root) exit("Couldn't find a suitable root.");

    require("./server").boot(config);
}

main({
    port : parseInt(process.env.PORT) || 8000,
    files : process.argv.slice(2),
    cwd : process.cwd()
});
