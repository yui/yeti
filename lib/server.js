var express = require("express");
var connect = require("connect");

var sendfiles = require("./sendfiles").sendfiles;
var ui = require("./ui");
var visitor = require("./visitor");

var tests = new (require("events").EventEmitter);

function makeId () {
    return (Math.random() * 0x1000000|0) + "";
}

function serveExpress (path, port) {

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

        var splat = params.splat.pop().split("/");
        if (splat[0] in testIds) splat.shift();
        splat = splat.join("/");

        var file = path + splat;

        if (/^.+\/build\/yui\/yui.*\.js$/.test(req.url)) {
            // inject a test reporter into YUI itself
            var url = "/results";
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

    app.get("/favicon.ico", function (req, res) {
        res.redirect("/inc/favicon.ico");
    });

    app.listen(port, null);

}

function fromConfiguration (config) {
    // server not already running

    serveExpress(
        config.root,
        config.port
    );

    var urls = visitor.composeURLs(
        "http://localhost:" + config.port,
        "project/" + config.path,
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

    var forceVisit = !!config.browsers;

    if (forceVisit) {
        ui.log("Running tests locally with: " + config.browsers.join(", "));

        return visitor.visit(
            config.browsers,
            ["http://localhost:" + config.port]
        );
    }
}

exports.fromConfiguration = fromConfiguration;
exports.serve = serveExpress;
