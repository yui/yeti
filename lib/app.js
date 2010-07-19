var sys = require("sys");
var http = require("http");

var sendfiles = require("./sendfiles").sendfiles;
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

    openURL(
        config.browsers,
        "http://localhost:" + config.port,
        config.path,
        config.files
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

function openURL (browsers, base, cwd, files) {
    startTime = new Date().getTime();
    files.forEach(function (file) {
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

            ui.log("Launching " + browser + "...");
            b.visit([base, "project", cwd, file].join("/"));

            pendingResults++;
        });
    });
}

function serveExpress (path, port) {

    configure(function() {
        set("root", __dirname);

        use(Static, { path: path, bufferSize : 0 });

        use(require("express/plugins/body-decoder").BodyDecoder);

        enable("show exceptions");
    });

    get("/", function() {
        this.respond(200, "all your test are belong to yeti");
    });

    post("/results", function () {

        var browser = Browsers.forAgent(this.headers["user-agent"]);

        var result = JSON.parse(this.params.post.results);

        everything.failed += result.failed;
        everything.passed += result.passed;

        var icon = result.failed ? ui.bad : ui.good;
        var color = result.failed ? ui.color.red : ui.color.green;
        ui.log(color(icon) + "  " + ui.color.bold(result.name) + " on " + browser);
        ui.log("  " + result.passed + " passed");
        ui.log("  " + result.failed + " failed");

        this.respond(200, "ok");

        if (!--pendingResults) summarize();
    });

    get('/project/*', function (file) {
        var file = path + "/" + file;

        if (/^.+\/build\/yui\/yui.*\.js$/.test(this.url.href)) {
            // inject a test reporter into YUI itself
            var url = "http://localhost:" + port + "/results";
            sendfiles.call(
                this,
                [file, require("path").normalize(__dirname + "/../inc/inject.js")],
                "window.YCLI = { url : \"" + url + "\" };"
            );
        } else {
            // everything else goes untouched
            this.sendfile(file);
        }
    });

    run(port, "localhost");

}
