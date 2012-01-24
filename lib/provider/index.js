"use strict";

var http = require("http");
var director = require("director");
var Beryl = require("./beryl");

/**
 * A **Provider** augments an existing `http.Server`
 * with a static file server to serve test files.
 * There's a twist: the HTML files served have
 * JavaScript injected to report test results
 * automatically.
 *
 * @class Provider
 * @constructor
 * @param {Object} options basedir
 */

function Provider(options) {
    this.beryl = new Beryl('\n<script src="/yeti/inject.js"></script>');
    this.router = this.createRouter(options.basedir);
}

Provider.prototype.lastResort = function () {
    this.res.writeHead(404, {
        "Content-Type": "text/plain"
    });
    this.res.end("Not Found");
};

/**
 * @method createRouter
 * @private
 * @param {String} basedir
 * @param {Array} files Filenames to serve, relative to the basedir.
 * @return {Router} router
 */
Provider.prototype.createRouter = function (basedir) {
    var self = this,
        router = new director.http.Router({
            on: self.lastResort
        });

    router.configure({
        async: true,
        recurse: "backward"
    });


    router.path(/\/public\/(.*)/, function () {
        this.get(function (file, foo, next) {
            var server = this;
            self.beryl.streamFiles({
                req: server.req,
                res: server.res,
                files: [basedir + "/" + file]
            }, function (err) {
                if (err) {
                    next();
                }
                server.res.end();
                next(false);
            });
        });
    });

    router.get(/\/yeti\/inject.js/, function () {
        self.beryl.streamFiles({
            req: server.req,
            res: server.res,
            files: [__dirname + "/inject.js"]
        }, function (err) {
            if (err) {
                next();
            }
            server.res.end();
            next(false);
        });
    });

    return router;
};

/**
 * Inject our handler in the HTTP Server's request listener.
 *
 * @method setupServer
 * @private
 * @param {Server} HTTP Server.
 * @param {Router} Director Router.
 */
Provider.prototype.setupServer = function (httpServer, router) {
    var self = this,
        listeners = httpServer.listeners("request");

    httpServer.removeAllListeners("request");

    httpServer.on("request", function (req, res) {
        if (router.dispatch(req, res)) {
            return;
        }

        var server = this;

        listeners.forEach(function (listener) {
            listener.call(server, req, res);
        });
    });

    return httpServer;
};

/**
 * @method listen
 * @param {Server} httpServer The `http.Server` to augment.
 * @return {Server}
 */
Provider.prototype.listen = function (httpServer) {
    return this.setupServer(httpServer, this.router);
};

Provider.prototype.createServer = function () {
    return this.listen(http.createServer(function (req, res) {
        // Default handler.
        Provider.prototype.lastResort.call({
            req: req,
            res: res
        });
    }));
};

module.exports = Provider;

if (!module.parent) {
   (new Provider({basedir: __dirname})).createServer().listen(3000);
}
