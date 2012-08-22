"use strict";

/**
 * @module events
 */

var util = require("util");
var EventEmitter2 = require("eventemitter2").EventEmitter2;

/**
 * An extension of EventEmitter2.
 *
 * Provided as `exports.EventEmitter2`.
 *
 * @class YetiEventEmitter2
 * @constructor
 * @inherits EventEmitter2
 * @param {Object} options Options for EventEmitter2
 */
function YetiEventEmitter2(options) {
    if (!options) {
        options = {};
    }

    options.wildcard = true;

    EventEmitter2.call(this, options);
}

util.inherits(YetiEventEmitter2, EventEmitter2);

/**
 * Emit a debug log event.
 *
 * @method debug
 * @protected
 */
YetiEventEmitter2.prototype.debug = function debug() {
    var args = Array.prototype.slice.apply(arguments);
    args.unshift(["log", "debug"]);
    this.emit.apply(this, args);
};

function getName(context) {
    var id,
        name = context.constructor.name;

    if (!name) {
        name = "Unknown Source";
    }

    if (context.id) {
        id = context.id;
    } else if (context.name) {
        id = context.name;
    }

    if (id) {
        name += "#" + id;
    }

    return "<" + name + ">";
}

/**
 * Re-emit log messages on the provided target.
 *
 * @method pipeLog
 * @param {EventEmitter2} target Re-emit log messages on this target.
 */
YetiEventEmitter2.prototype.pipeLog = function pipeLog(target) {
    this.on("log.**", function reflector() {
        var args = Array.prototype.slice.apply(arguments);
        args.unshift(getName(this) + " ->");
        args.unshift(this.event);
        target.emit.apply(target, args);
    });
};

exports.EventEmitter2 = YetiEventEmitter2;
