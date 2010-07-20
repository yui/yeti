var Browsers = require("./browsers").Browsers;

var ui = require("./ui");

var everything = {
    passed : 0,
    failed: 0
};

var startTime = 0;
var pendingResults = 0;

exports.boot = function (config) {

    serveExpress(
        config.root,
        config.port
    );

    if (
        !config.browsers
    ) config.browsers = Browsers.canonical();

    config.browsers = config.browsers.split(",");

    var urls = composeURLs(
        "http://localhost:" + config.port,
        config.path,
        config.files
    );

    visit(
        config.browsers,
        urls
    );

};

function summarize () {
    var duration = new Date().getTime() - startTime;
    var time = " (" + duration + "ms)";
    ui.log("");
    if (everything.failed) {
        var total = everything.passed + everything.failed;
        ui.log(
            ui.color.red("Failures") + ": "
            + everything.failed + " of " + total
            + " tests failed." + time
        );
    } else {
        ui.log(ui.color.green(everything.passed + " tests passed!") + time);
    }
    process.exit(0);
}

function composeURLs (base, cwd, files) {
    var urls = [];
    files.forEach(function (file) {
        urls.push([base, "project", cwd, file].join("/"));
    });
    return urls;
};

function visit (browsers, urls) {
    startTime = new Date().getTime();
    urls.forEach(function (url) {
        var fallback = false;
        browsers.forEach(function (browser) {
            // ucfirst
            browser = browser[0].toUpperCase() + browser.substr(1).toLowerCase();

            if (Browsers[browser]) {
                var b = new Browsers[browser];
                if (!b.supported()) {
                    ui.log(browser + " is not available on this platform.");
                }
            } else {
                ui.log(browser + " is not supported.");
                return;
            }

            b.visit(url);

            pendingResults++;
        });
    });
}

function serveExpress (path, port) {

    var express = require("express");
    var connect = require("connect");

    var sendfiles = require("./sendfiles").sendfiles;

    var app = express.createServer(
        connect.bodyDecoder()
    );

    app.get("/", function(req, res) {
        res.send("all your test are belong to yeti", 200);
    });

    app.post("/results", function (req, res) {

        var browser = Browsers.forAgent(req.headers["user-agent"]);

        var result = JSON.parse(req.body.results);

        everything.failed += result.failed;
        everything.passed += result.passed;

        var icon = result.failed ? ui.bad : ui.good;
        var color = result.failed ? ui.color.red : ui.color.green;
        ui.log(color(icon) + "  " + ui.color.bold(result.name) + " on " + browser);
        ui.log("  " + result.passed + " passed");
        ui.log("  " + result.failed + " failed");

        res.send(200);

        if (!--pendingResults) summarize();
    });

    app.get('/project/*', function (req, res, params) {

        var file = path + params.splat;

        if (/^.+\/build\/yui\/yui.*\.js$/.test(req.url)) {
            // inject a test reporter into YUI itself
            var url = "http://localhost:" + port + "/results";
            sendfiles.call(
                res,
                [file, require("path").normalize(__dirname + "/../inc/inject.js")],
                "window.YCLI = { url : \"" + url + "\" };"
            );
        } else {
            // everything else goes untouched
            res.sendfile(file);
        }
    });

    app.listen(port, "localhost");

}
