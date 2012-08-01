#!/usr/bin/env node

"use strict";

var fs = require("fs"),
    url = require("url"),
    path = require("path"),
    http = require("http");

var depDir = path.join(__dirname, "..", "dep");

var YUI_TEST_URL = "http://yui.yahooapis.com/combo?3.6.0/build/yui-base/yui-base-min.js&3.6.0/build/oop/oop-min.js&3.6.0/build/event-custom-base/event-custom-base-min.js&3.6.0/build/event-base/event-base-min.js&3.6.0/build/event-simulate/event-simulate-min.js&3.6.0/build/event-custom-complex/event-custom-complex-min.js&3.6.0/build/substitute/substitute-min.js&3.6.0/build/json-stringify/json-stringify-min.js&3.6.0/build/test/test-min.js";

function log() {
    if (process.env.npm_config_loglevel !== "silent") {
        console.log.apply(null, Array.prototype.slice.call(arguments));
    }
}

function die(message) {
    console.warn(message.message || message);
    process.exit(1);
}

function saveURLToDep(sourceURL, filename, cb) {
    filename = path.join(depDir, filename);

    function done() {
        log("Saved", sourceURL, "as", filename);
    }

    log("Saving", sourceURL, "as", filename);

    http.get(url.parse(sourceURL), function onResponse(res) {
        if (res.statusCode !== 200) {
            die("Got status " + res.statusCode + " for URL " + sourceURL);
            return;
        }

        var data = "";

        res.setEncoding("utf8");

        res.on("data", function (chunk) {
            data += chunk;
        });

        res.on("end", function () {
            fs.writeFile(filename, data, "utf8", done);
        });
    }).on("error", die);
}

function download(err) {
    if (err) {
        die(err);
    }

    [
        [YUI_TEST_URL, "yui-test.js"],
        ["http://cdn.sockjs.org/sockjs-0.3.min.js", "sock.js"]
    ].forEach(function downloader(args) {
        saveURLToDep.apply(null, args);
    });
}

log("Downloading script dependencies...");

fs.readdir(depDir, function (err) {
    if (err) {
        log("Attempting to create directory", depDir);
        fs.mkdir(depDir, download);
    } else {
        log("Found directory", depDir);
        download();
    }
});

var history;

fs.readFile(path.join(__dirname, "..", "HISTORY.md"), "utf8", function (err, data) {
    history = data.split("\n").slice(2, 20).join("\n");
    process.on("exit", function () {
        log("\nThanks for installing Yeti", process.env.npm_package_version);
        log("\nRecent changes in HISTORY.md:\n\n" + history);
    });
});



