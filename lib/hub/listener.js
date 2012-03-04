"use strict";

/**
 * @module listener
 */

var util = require("util"),
    url = require("url");

/**
 * A **HubListener** augments an existing `http.Server`,
 * adding Hub handling to a given route.
 *
 * The default route is `/yui`, which can be changed by
 * passing an options object with a route property.
 *
 * @class HubListener
 * @extends process.EventEmitter
 * @constructor
 * @param {Hub} hub An instance of Hub.
 * @param {Server} server The `http.Server` to augment.
 * @param {Object} options Options.
 */
function HubListener(hub, server, options) {
    process.EventEmitter.call(this);
    this.options = options || {};
    this.route = this.options.route || "/yeti";
    this.server = server;
    this.hub = hub;
    this._setupServer();
}

util.inherits(HubListener, process.EventEmitter);

var proto = HubListener.prototype;

/**
 * Inject our handler into the request listener.
 * If the request didn't start with `this.route`,
 * call the existing listeners.
 *
 * @method _setupServer
 * @private
 */
proto._setupServer = function () {
    var self = this,
        listeners = this.server.listeners("request");
    this.server.removeAllListeners("request");
    this.server.on("request", function (req, res) {
        if (self.match(req, res)) {
            return;
        }
        var server = this;
        listeners.forEach(function (listener) {
            listener.call(server, req, res);
        });
    });
};

/**
 * Check if this request begins with `this.route`.
 * If it does, handle it with Hub.
 *
 * @method match
 * @param {Object} req An HTTP Request.
 * @param {Object} res An HTTP Response.
 * @return {Boolean} True if matched, false otherwise.
 */
proto.match = function (req, res) {
    var parsedUrl = url.parse(req.url);
    if (parsedUrl.pathname.indexOf(this.route) === 0) {
        parsedUrl.pathname = parsedUrl.pathname.substr(this.route.length);
        req.url = url.format(parsedUrl);
        this.hub.server.emit("request", req, res);
        return true;
    }
    return false;
};

// Export HubListener.
module.exports = HubListener;
