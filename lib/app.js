var Browsers = require("./browsers").Browsers;

var ui = require("./ui");
var http = require("./http");

exports.boot = function (config) {

    var forceVisit = !!config.browsers;

    if (
        !config.browsers
    ) config.browsers = Browsers.canonical();

    config.browsers = config.browsers.split(",");

    var urls = composeURLs(
        "http://localhost:" + config.port,
        "project/" + config.path,
        config.files
    );

    var d = {
        host : "localhost",
        port : config.port
    };

    d.method = "PUT";
    d.path = "/tests/add";
    d.body = { tests : composeURLs(
        "",
        config.path,
        config.files
    ) };
    var req = http.request(d);

    req.on("response", function (res, id) {
        ui.log("Batch registered:", id);
        d.method = "GET";
        d.path = "/status/" + id;
        (function moreResults () {
            http.request(d).on("response", function (res, result) {
                if (res.statusCode === 200) {
                    ui.results(result);
                    moreResults();
                } else {
                    ui.log(ui.color.red("Error") + ": The server says: " + result);
                    process.exit(0);
                }
            });
        })();
    });

    req.on("error", function () {
        // server not already running

        serveExpress(
            config.root,
            config.port
        );

        if (urls.length) return visit(
            config.browsers,
            urls
        );

        var host = "localhost";

        require("child_process").exec("uname -n", function (err, stdout) {
            if (stdout) host = stdout.replace(/\n/, "");
            ui.log("Visit " +
                ui.color.bold(
                    "http://" + host + ":" + config.port
                ) + " to run tests."
            );
        });

        if (forceVisit) {
            ui.log("Running tests locally with: " + config.browsers.join(", "));

            return visit(
                config.browsers,
                ["http://localhost:" + config.port]
            );
        }
    });
};

function composeURLs (base, cwd, files) {
    var urls = [];
    files.forEach(function (file) {
        urls.push([base, cwd, file].join("/"));
    });
    return urls;
};

function visit (browsers, urls) {
    ui.start();
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

            ui.pending();
        });
    });
}

function serveExpress (path, port) {

    var express = require("express");
    var connect = require("connect");

    var sendfiles = require("./sendfiles").sendfiles;

    var uuid = require("./uuid").uuidFast;

    var tests = new (require("events").EventEmitter);

    var app = express.createServer(
        connect.methodOverride(),
        connect.bodyDecoder()
    );

    app.set("views", __dirname + "/views");
    app.set("view engine", "jade");

    app.get("/", function(req, res){
        res.render("index");
    });

    var testIds = {};
    var testResults = {};
    var testQueue = {};

    app.put("/tests/add", function (req, res) {
        if (!req.body.tests.length) return;

        var urls = [];
        var id = uuid();

        req.body.tests.forEach(function (url) {
            urls.push("/project/" + id + url);
        });
        ui.log("/tests/add: registered batch", id);

        if (tests.listeners("add").length) {
            tests.emit("add", id, urls);
        } else {
            testQueue[id] = urls;
        }

        res.send(id);
    });

    app.get("/tests/wait", function (req, res) {
        var cb = function (id, urls) {
            ui.log("/tests/wait: send", urls);
            res.send({
                tests : urls
            });
            tests.removeListener("add", cb);
            testIds[id] = 1;
        };
        tests.on("add", cb);
        if (testQueue) {
            for (
                var id in testQueue
            ) tests.emit("add", id, testQueue[id]);
            testQueue = [];
        }
    });

    app.get("/status/:id", function (req, res, params) {
        if (params.id in testIds) {
            tests.on(params.id, function (results) {
                res.send(results);
            });
        } else {
            delete testQueue[params.id];
            res.send("Nothing is listening to this batch. At least one browser should be pointed at the Yeti server.", 404);
        }
    });

    app.post("/results", function (req, res) {

        var result = JSON.parse(req.body.results);
        result.ua = req.body.useragent;
        var id = req.body.id;

        if (id in testIds) {
            if ( ! (id in testResults) ) {
                testResults[id] = [];
            }
            testResults[id].push(result);
            tests.emit(id, result);
        } else {
            ui.results(result);
        }

        res.send(200);
    });

    app.get('/project/*', function (req, res, params) {

        var splat = params.splat.pop().split("/");
        if (splat[0] in testIds) splat.shift();
        splat = splat.join("/");

        var file = path + splat;

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

    app.get("/inc/*", function (req, res, params) {

        var file = __dirname + "/../inc/" + params.splat;

        res.sendfile(file);

    });

    app.listen(port, "localhost");

}
