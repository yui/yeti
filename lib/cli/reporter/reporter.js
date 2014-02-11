"use strict";

var util = require("util");
var EventEmitter2 = require("../../event-emitter");

/**
 * @class Reporter
 * @constructor
 * @param {Object} config Options.
 * @param {Console} config.cli Console. (Formerly CLI.)
 * @param {Object} config.options Options.
 * @param {ClientBatch} config.batch Batch.
 */
function Reporter(config) {
    EventEmitter2.call(this);

    this.cli = config.cli;
    this.batch = config.batch;
    this.options = config.options;
    this.name = config.options.get("name");
}

util.inherits(Reporter, EventEmitter2);

/**
 * Fires when reporter has finished writing data.
 *
 * @event end
 * @param {Number} Requested exit code: 0 (success), 1 (problem with reporter), or 3 (test failure).
 */

/**
 * Bind events from the given Batch to this reporter.
 *
 * @method bindEvents
 * @param {Batch}
 */
Reporter.prototype.bindEvents = function () {
    throw new Error("Not implemented.");
};

module.exports = Reporter;
