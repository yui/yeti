#!/usr/bin/env node

"use strict";

var fs = require("fs"),
    url = require("url"),
    path = require("path"),
    http = require("http"),
    https = require("https");

var depDir = path.join(__dirname, "..", "dep");

var YUI_TEST_URL = "http://yui.yahooapis.com/combo?3.7.3/build/yui-base/yui-base-min.js&3.7.3/build/oop/oop-min.js&3.7.3/build/event-custom-base/event-custom-base-min.js&3.7.3/build/event-base/event-base-min.js&3.7.3/build/event-simulate/event-simulate-min.js&3.7.3/build/event-custom-complex/event-custom-complex-min.js&3.7.3/build/substitute/substitute-min.js&3.7.3/build/json-stringify/json-stringify-min.js&3.7.3/build/test/test-min.js";

var QUNIT_JS_URL = "http://code.jquery.com/qunit/qunit-1.10.0.js";
var QUNIT_CSS_URL = "http://code.jquery.com/qunit/qunit-1.10.0.css";

var JASMINE_JS_URL = "https://raw.github.com/pivotal/jasmine/v1.3.1/lib/jasmine-core/jasmine.js";
var JASMINE_JS_REPORTER_URL = "https://raw.github.com/pivotal/jasmine/v1.3.1/lib/jasmine-core/jasmine-html.js";
var JASMINE_CSS_URL = "https://raw.github.com/pivotal/jasmine/v1.3.1/lib/jasmine-core/jasmine.css";

var MOCHA_JS_URL = "https://raw.github.com/visionmedia/mocha/1.8.1/mocha.js";
var MOCHA_JS_ASSERTION_URL = "https://raw.github.com/LearnBoost/expect.js/0.2.0/expect.js";
var MOCHA_CSS_URL = "https://raw.github.com/visionmedia/mocha/1.8.1/mocha.css";

var YUI_RUNTIME_URL = "http://yui.yahooapis.com/combo?3.7.3/build/yui-base/yui-base-min.js&3.7.3/build/oop/oop-min.js&3.7.3/build/event-custom-base/event-custom-base-min.js&3.7.3/build/event-custom-complex/event-custom-complex-min.js&3.7.3/build/event-base/event-base-min.js&3.7.3/build/attribute-events/attribute-events-min.js&3.7.3/build/attribute-core/attribute-core-min.js&3.7.3/build/base-core/base-core-min.js&3.7.3/build/cookie/cookie-min.js&3.7.3/build/array-extras/array-extras-min.js";

var DOJO_URL = "http://download.dojotoolkit.org/release-1.8.3/dojo.js";
var DOJO_DOH_RUNNER_URL = "http://download.dojotoolkit.org/release-1.8.3/dojo-release-1.8.3/util/doh/runner.js";

var existsSync = fs.existsSync || path.existsSync;

function log() {
    if (process.env.npm_config_loglevel !== "silent") {
        console.log.apply(null, Array.prototype.slice.call(arguments));
    }
}

var options = {
        "dev": false,
        "minify": false,
        "debug": false
    },
    argv = [];

function applyArgv() {
    var k, v;
    for (k in options) {
        v = argv.some(function (arg) {
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
        argv = JSON.parse(process.env.npm_config_argv).original;
    } catch (ex) {
        // Nothing.
    }
}

argv = argv.concat(process.argv.splice(1));

if (argv.length) {
    applyArgv();
}

function die(message) {
    console.warn(message.message || message);
    process.exit(1);
}

function saveURLToDep(sourceURL, filename, cb) {
    var protocol = url.parse(sourceURL).protocol;

    protocol = (protocol === "http:") ? http : https;
    filename = path.join(depDir, filename);

    function done() {
        log("Saved", sourceURL, "as", filename);
    }

    log("Saving", sourceURL, "as", filename);

    protocol.get(url.parse(sourceURL), function onResponse(res) {
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
    var scripts = [
        [YUI_RUNTIME_URL, "yui-runtime.js"],
        ["http://cdn.sockjs.org/sockjs-0.3.min.js", "sock.js"]
    ];

    if (err) {
        die(err);
    }

    if (options.dev) {
        scripts = scripts.concat([
            [YUI_TEST_URL, "dev/yui-test.js"],
            [QUNIT_JS_URL, "dev/qunit.js"],
            [QUNIT_CSS_URL, "dev/qunit.css"],
            [JASMINE_JS_URL, "dev/jasmine.js"],
            [JASMINE_JS_REPORTER_URL, "dev/jasmine-html.js"],
            [JASMINE_CSS_URL, "dev/jasmine.css"],
            [MOCHA_JS_URL, "dev/mocha.js"],
            [MOCHA_JS_ASSERTION_URL, "dev/expect.js"],
            [MOCHA_CSS_URL, "dev/mocha.css"],
            [DOJO_URL, "dev/dojo.js"],
            [DOJO_DOH_RUNNER_URL, "dev/dojo-doh-runner.js"]
        ]);
    }

    scripts.forEach(function downloader(args) {
        if (!options.dev && existsSync(path.join(depDir, args[1]))) {
            return;
        }

        if (options.debug && args[0].indexOf("yui") !== -1) {
            args[0] = args[0].replace(/[\.\-]min\.js/g, "-debug.js");
        }

        if (!options.minify) {
            args[0] = args[0].replace(/[\.\-]min\.js/g, ".js");
        }

        saveURLToDep.apply(null, args);
    });
}

log("Checking for script dependencies...");

fs.readdir(depDir, function (err) {
    if (err) {
        log("Attempting to create directory", depDir);
        fs.mkdir(depDir, download);
    } else {
        log("Found directory", depDir);
        download();
    }
});
