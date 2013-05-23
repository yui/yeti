#!/usr/bin/env node

"use strict";

var fs = require("fs"),
    path = require("path"),
    existsSync = fs.existsSync || path.existsSync,
    history;

function log() {
    if (process.env.npm_config_loglevel !== "silent") {
        console.log.apply(null, Array.prototype.slice.call(arguments));
    }
}

// Avoid fetching deps if possible. See GH-42.
if (!fs.existsSync(path.join(__dirname, "..", "dep"))) {
    require("./fetch_deps");
}

fs.readFile(path.join(__dirname, "..", "HISTORY.md"), "utf8", function (err, data) {
    history = data.split("\n").slice(2, 20).join("\n");
    process.on("exit", function () {
        log("\nThanks for installing Yeti", process.env.npm_package_version || 'dev/master');
        log("\nRecent changes in HISTORY.md:\n\n" + history);
    });
});
