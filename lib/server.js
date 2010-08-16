var express = require("express");
var connect = require("connect");
var http = require("http");

var sendfiles = require("./sendfiles").sendfiles;
var ui = require("./ui");
var visitor = require("./visitor");

var tests = new (require("events").EventEmitter);

function makeId () {
    return (Math.random() * 0x1000000|0) + "";
}

function serveExpress (port, path, cb) {

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
        if (!req.body.tests.length) return res.send(500);

        var urls = [];
        var id = makeId();

        req.body.tests.forEach(function (url) {
            urls.push("/project/" + id + url);
        });
        ui.debug("/tests/add: registered batch", id);

        if (tests.listeners("add").length) {
            tests.emit("add", id, urls);
        } else {
            testQueue[id] = urls;
        }

        res.send(id);
    });

    function wait (req, responseCallback) {
        var cb = function (id, urls) {
            ui.debug("/tests/wait: send", urls);
            responseCallback({
                tests : urls
            });
            testIds[id] = 1;
        };
        tests.on("add", cb);
        req.on("end", function () {
            tests.removeListener("add", cb);
        });
        if (testQueue) {
            for (
                var id in testQueue
            ) tests.emit("add", id, testQueue[id]);
            testQueue = [];
        }
    }

    app.get("/tests/wait", function (req, res) {
        res.writeHead(200, {
            "Content-Type" : "text/event-stream"
        });
        wait(req, function (data) {
            res.write("data: " + JSON.stringify(data) + "\n\n");
        });
    });

    app.post("/tests/wait", function (req, res) {
        wait(req, function (data) {
            res.send(data);
            req.emit("end"); // will remove add listener
        });
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

        ui.debug("/results:", id, " has results from: " + result.ua);

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

        // TODO: fix test
        // that causes us to normalize leading slashes

        var splat = params.splat.pop().split("/");
        if (splat[0] in testIds) splat.shift();
        if (splat[0] === "") splat.shift(); // stupid leading slashes
        splat = splat.join("/");

        var file = "/" + splat;

        // the requested file must begin with our cwd
        if (file.indexOf(path) !== 0) {
            // the file is outside of our cwd
            // reject the request
            ui.log(ui.color.red("[!]")
                + " Rejected " + file
                + ", run in the directory to serve"
                + " or specify --path.");
            return res.send(403);
        }

        var payload = [file];

        if (/^.*\.html?$/.test(req.url)) {
            // inject a test reporter into the test page
            sendfiles.call(
                res, payload,
                "<script src=\"/inc/inject.js\"></script><script>"
                + "$yetify({url:\"/results\"});</script>"
            );
        } else {
            // everything else goes untouched
            sendfiles.call(res, payload);
        }

    });

    var incSend = function (res, name) {
        sendfiles.call(
            res,
            [__dirname + "/../inc/" + name]
        );
    };

    //var cachebuster = makeId();

    app.get("/inc/*", function (req, res, params) {
        incSend(res, params.splat);
        //var file = params.splat;
        //res.redirect("/dyn/" + cachebuster + "/" + file);
    });

    app.get("/dyn/:cachebuster/*", function (req, res, params) {
        incSend(res, params.splat);
    });

    app.get("/favicon.ico", function (req, res) {
        incSend(res, "favicon.ico");
    });

    // workaround express and connect bugs
    // that strip out the host and callback args!
    // n.b.: express' impl of run sets up view reloading
    // and the sets env to process.env.ENV, etc.
    // we are bypassing all of that by using http directly
    http.Server.prototype.listen.call(app, port, null, cb);

    return app;

}

function fromConfiguration (config) {
    // server not already running

    var cb = config.callback;
    cb = cb || null;

    var app = serveExpress(config.port, config.path, cb);

    var urls = visitor.composeURLs(
        "http://localhost:" + config.port,
        "project" + config.path,
        config.files
    );

    if (urls.length) return visitor.visit(
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

    if (config.forceVisit) {
        ui.log("Running tests locally with: " + config.browsers.join(", "));

        return visitor.visit(
            config.browsers,
            ["http://localhost:" + config.port]
        );
    }

    return app;
}

exports.tests = tests;
exports.fromConfiguration = fromConfiguration;
exports.serve = serveExpress;
