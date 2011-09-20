var express = require("express");
var connect = require("connect");
var http = require("http");
var events = require("events");
var io = require("socket.io");

var sendfiles = require("./sendfiles").sendfiles;
var ui = require("./ui");
var visitor = require("./visitor");
var pkg = require("./package");

// Return a random whole number as a string with `Math.random`.
function makeId () {
    return (Math.random() * 0x1000000|0) + "";
}

var emitterRegistry = {}; // by port

var cachebuster = makeId();

// Returns a JSON string of all property-value pairs
// of `keys` in `req`.
function jsonize (req, keys) {
    var o = {};
    keys.forEach(function (k) {
        var v = req.param(k);
        if (v) o[k] = v;
    });
    return JSON.stringify(o);
}

function serveExpress (port, path, cb) {

    // Create an `EventEmitter` for test-related events.
    var tests = new events.EventEmitter;

    var app = express.createServer(
        connect.methodOverride(),
        connect.bodyParser()
    );

    var socket = io.listen(app);

    app.set("views", __dirname + "/views");
    app.set("view engine", "jade");

    // Use our version of Jade.
    app.register(".jade", require("jade"));

    app.get("/", function (req, res) {
        tests.emit("visitor", req.ua);
        var json = jsonize(req, ["transport", "timeout"]);

        res.header("Expires", "0");
        res.header("Pragma", "no-cache");
        res.header("Cache-Control", "no-cache");

        res.render("index", {
            bootstrap : "YETI.start(" + json + ")",
            yeti_version : pkg.readPackageSync().version
        });
    });

    var testIds = {};
    var testResults = {};

    // testId (batch) -> socket.io client IDs when batch was created
    var testClients = {};

    // Add a new test. Called by the CLI in `app.js`.
    app.put("/tests/add", function (req, res) {
        if (!req.body.tests.length) {
            return res.send("No tests provided. Possible Yeti bug!", 500);
        }

        var clients = Object.keys(socket.clients);

        if (!clients.length) {
            return res.send("Nothing is listening to this batch. At least one browser should be pointed at the Yeti server.", 500);
        }

        var urls = [];
        var id = makeId();

        req.body.tests.forEach(function (url) {
            urls.push("/project/" + id + url);
        });
        ui.debug("/tests/add: registered batch", id);

        tests.emit("add", id, urls, clients);
        res.send(id);
    });

    // Comet middleware.
    // Sends a response when a test comes in.
    socket.on("connection", function wait (client) {
	var ip = ((client.connection && client.connection.remoteAddress) ? ' from ' + client.connection.remoteAddress : '');
        console.log("Yeti loves " + client.sessionId + ip);
        client.on("message", function (message) {
            // On done, remove from testClients.
            // If testClients is now empty, notify the CLI we're done.
            var batch = message.batch;

            if (message.status === "done") {
                if (batch in testClients) {
                    var clients = testClients[message.batch];

                    // Remove this sessionId from clients.
                    console.log("YUP, done!");
                    console.log(clients);
                    clients = clients.filter(function (id) {
                        return id !== client.sessionId;
                    });
                    testClients[batch] = clients;

                    console.log(clients);
                    // If clients is now empty, notify the CLI we're done.
                    if (!clients.length) {
                        console.log("Really done!");
                        tests.emit(batch, message);
                        delete testIds[batch];
                        delete testClients[batch];
                    }
                } else {
                    ui.log("Warning: Unknown batch completion. Yeti bug!");
                }
            } else {
                ui.debug("Unknown message from " + client.sessionId);
            }
        });
    });

    tests.on("add", function testAdd (id, urls, clients) {
        ui.debug("Broadcasting test URLs", urls);
        socket.broadcast({
            batch : id,
            tests : urls
        });
        testIds[id] = 1;
        testClients[id] = clients;
    });

    // Respond when test results for the given batch ID arrive.
    // Called by the CLI in `app.js`.
    app.get("/status/:id", function (req, res) {
        var id = req.params.id;
        if (id in testIds) {
            if (id in testResults) {
                var results = testResults[id].shift();
                if (results) {
                    return res.send(results);
                } else {
                    // nothing in the queue
                    delete testResults[id];
                    // fallthrough to the test listener
                }
            }
            tests.once(id, function (results) {
                res.send(results);
            });
        } else {
            res.send("Batch not found, it should be registered first with /tests/add. Possible Yeti bug!", 404);
        }
    });

    // Recieves test results from the browser.
    app.post("/results", function (req, res) {

        var result = JSON.parse(req.body.results);
        result.ua = req.body.useragent;
        var id = req.body.id;

        ui.debug("/results:", id, " has results from: " + result.ua);

        if (id in testIds) {
            if (tests.listeners(id).length) {
                tests.emit(id, result);
            } else {
                if ( ! (id in testResults) ) {
                    testResults[id] = [];
                }
                testResults[id].push(result);
            }
        } else {
            ui.results(result);
        }

        // Advance to the next test immediately.
        // We do this here because determining if an iframe has loaded
        // is much harder on the client side. Takes advantage of the
        // fact that we're on the same domain as the parent page.
        res.send("<script>parent.parent.YETI.next()</script>");

    });

    app.get('/undefined', function(req, res) {
        ui.debug("Possible Yeti bug, we were sent to /undefined");
        res.send("<script>parent.parent.YETI.next()</script>");
    });

    // #### File Server

    var projectSend = function (res, file, appendString, nocache, prependString) {
        sendfiles.call(
            res,
            [file],
            appendString,
            null, // callback
            {
                prependString : prependString,
                cache : !nocache
            }
        );
    };

    app.get('/project/*', function (req, res) {

        var nocache = false;
        var splat = req.params.pop().split("/");
        if (splat[0] in testIds) {
            splat.shift();
            nocache = true; // using a unique url
        }
        if (splat[0] === "") splat.shift(); // stupid leading slashes
        splat = splat.join("/");

        var file = "/" + decodeURIComponent(splat);

        // The requested file must begin with our cwd.
        if (file.indexOf(path) !== 0) {
            // The file is outside of our cwd.
            // Reject the request.
            ui.log(ui.color.red("[!]")
                + " Rejected " + file
                + ", run in the directory to serve"
                + " or specify --path.");
            return res.send(403);
        }

        if (/^.*\.html?$/.test(req.url)) {
            // Inject a test reporter into the test page.
            projectSend(
                res, file,
                "<script src=\"/dyn/" + cachebuster
                + "/inject.js\"></script><script>"
                + "$yetify({url:\"/results\"});</script>",
                nocache
            );
        } else {
            // Everything else goes untouched.
            projectSend(res, file, "", nocache);
        }

    });

    var incSend = function (res, name, nocache) {
        sendfiles.call(
            res,
            [__dirname + "/../inc/" + name],
            "", // appendString
            null, // callback
            {
                cache : !nocache
            }
        );
    };

    app.get("/inc/*", function (req, res) {
        incSend(res, req.params);
    });

    app.get("/dyn/:cachebuster/*", function (req, res) {
        incSend(res, req.params, true);
    });

    app.get("/favicon.ico", function (req, res) {
        incSend(res, "favicon.ico", true);
    });

    // Start the server.
    // Workaround Express and/or Connect bugs
    // that strip out the `host` and `callback` args.
    // n.b.: Express's `run()` sets up view reloading
    // and sets the `env` to `process.env.ENV`, etc.
    // We are bypassing all of that by using http directly.
    http.Server.prototype.listen.call(app, port, null, cb);

    // Publish the `tests` emitter.
    emitterRegistry[port] = tests;

    return app;

}

// Handle the CLI server start request. Called from `app.js`.
// Starts the server, prints a message and may open browsers as needed.
// Called when the server isn't already running.
function fromConfiguration (config) {

    var cb = config.callback;
    cb = cb || null;

    var app = serveExpress(config.port, config.path, cb);

    var baseUrl = "http://" + config.host + ":" + config.port;

    var urls = visitor.composeURLs(
        baseUrl,
        "project" + config.path,
        config.files
    );

    if (urls.length) return visitor.visit(
        config.browsers,
        urls
    );

    ui.log("Yeti will only serve files inside " + config.path);
    ui.log("Visit " + ui.color.bold(baseUrl) + ", then run:");
    ui.log("    yeti <test document>");
    ui.log("to run and report the results.");

    if (config.forceVisit) {
        ui.log("Running tests locally with: " + config.browsers.join(", "));

        return visitor.visit(
            config.browsers,
            [baseUrl]
        );
    }

    return app;
}

// Get the cachebuster for unit tests.
exports.getCachebuster = function () {
    return cachebuster;
};

// Get the `tests` emitter for unit tests.
exports.getEmitterForPort = function (port) {
    return emitterRegistry[port];
}

// Get the ports we've used for unit tests.
exports.getPorts = function () {
    return Object.keys(emitterRegistry);
}

exports.fromConfiguration = fromConfiguration;
exports.serve = serveExpress;
