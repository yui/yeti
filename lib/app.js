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
        config.path,
        config.files
    );

    var d = {
        host : "localhost",
        port : config.port
    };

    var req = (function (x) {
        x.method = "PUT";
        x.path = "/tests/add";
        x.body = { tests : urls };
        return http.request(x);
    })(d);

    req.on("response", function (res, data) {
        ui.log(data);
        d.method = "GET";
        d.path = "/status/" + data;
        (function moreResults () {
            http.request(d).on("response", function (res, result) {
                if (res.statusCode === 200) {
                    ui.results(result);
                    moreResults();
                } else {
                    ui.log("goodbye: " + result);
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

        ui.log("Serving YETI on port " + config.port);

        if (forceVisit) {
            ui.log("Opening: " + config.browsers.join(", "));

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
        urls.push([base, "project", cwd, file].join("/"));
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
        res.render("index", {
            locals : {
                url : "http://localhost:" + port + "/wait"
            }
        });
    });

    var testIds = {};
    var testResults = {};
    var testQueue = {};

    app.put("/tests/add", function (req, res) {
        if (!req.body.tests.length) return;

        var urls = [];
        var id = uuid();

        req.body.tests.forEach(function (url) {
            urls.push(url + "#" + id);
        });

        if (tests.listeners("add").length) {
            tests.emit("add", id, urls);
        } else {
            testQueue[id] = urls;
        }

        res.send(id);
    });

    app.get("/tests/wait", function (req, res) {
        tests.on("add", function (id, urls) {
            ui.log(urls);
            res.send({
                tests : urls
            });
            testIds[id] = 1;
        });
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
            res.send("No such id", 404);
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

    app.get("/inc/*", function (req, res, params) {

        var file = __dirname + "/../inc/" + params.splat;

        ui.log(file);

        res.sendfile(file);

    });

    app.listen(port, "localhost");

}
