#!/usr/bin/env node

"use strict";

var fs = require("fs"),
    url = require("url"),
    path = require("path"),
    http = require("http");

var depDir = path.join(__dirname, "..", "dep");

var YUI_TEST_URL = "http://yui.yahooapis.com/combo?3.7.3/build/yui-base/yui-base-min.js&3.7.3/build/oop/oop-min.js&3.7.3/build/event-custom-base/event-custom-base-min.js&3.7.3/build/event-base/event-base-min.js&3.7.3/build/event-simulate/event-simulate-min.js&3.7.3/build/event-custom-complex/event-custom-complex-min.js&3.7.3/build/substitute/substitute-min.js&3.7.3/build/json-stringify/json-stringify-min.js&3.7.3/build/test/test-min.js";

var YUI_RUNTIME_URL = "http://yui.yahooapis.com/combo?3.7.3/build/yui-base/yui-base-min.js&3.7.3/build/oop/oop-min.js&3.7.3/build/event-custom-base/event-custom-base-min.js&3.7.3/build/event-custom-complex/event-custom-complex-min.js&3.7.3/build/attribute-events/attribute-events-min.js&3.7.3/build/attribute-core/attribute-core-min.js&3.7.3/build/base-core/base-core-min.js&3.7.3/build/cookie/cookie-min.js&3.7.3/build/array-extras/array-extras-min.js";

function log() {
    if (process.env.npm_config_loglevel !== "silent") {
        console.log.apply(null, Array.prototype.slice.call(arguments));
    }
}

var options = {
        "minify": false,
        "debug": false
    },
    argv = {};

function applyArgv() {
    var k, v;
    for (k in options) {
        v = argv.original.some(function (arg) {
            return "--" + k === arg;
        });

        options[k] = v;

        if (v) {
            log("Enabled", k + ".");
            break;
        }
    }
}

if (process.env.npm_config_argv) {
    try {
        argv = JSON.parse(process.env.npm_config_argv);
    } catch (ex) {
        // Nothing.
    }

    if (argv.original) {
        applyArgv();
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
        [YUI_RUNTIME_URL, "yui-runtime.js"],
        ["http://cdn.sockjs.org/sockjs-0.3.min.js", "sock.js"]
    ].forEach(function downloader(args) {
        if (options.debug && args[0].indexOf("yui") !== -1) {
            args[0] = args[0].replace(/[\.\-]min\.js/g, "-debug.js");
        }

        if (!options.minify) {
            args[0] = args[0].replace(/[\.\-]min\.js/g, ".js");
        }
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



