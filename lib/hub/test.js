"use strict";

var path = require("path");
/**
 * @module test
 */

/**
 * Test represents a test file on disk.
 * May be overridden by subclasses to represent other types.
 *
 * @class Test
 * @constructor
 * @param {Object} options Options.
 * @param {String} options.location Location of this test.
 * @param {String} [options.query] Query string for this test.
 * @param {String} [options.batchId] Batch ID for this test.
 * @param {String} [options.mountpoint] Mountpoint for this test.
 */
function Test(options) {
    this.query = options.query;
    this.location = options.location;
    this.batchId = options.batchId;
    this.mountpoint = options.mountpoint;
    this.results = null;
    this.executing = false;
}

/**
 * Get the URL for this Test for the given Agent ID.
 *
 * @method getUrlForAgentId
 * @param {String} agentId Agent ID.
 * @return {String} Relative URL from this test's mountpoint.
 */
Test.prototype.getUrlForAgentId = function (agentId) {
    var url = this.mountpoint;
    url += "agent" + path.sep + agentId;
    url += path.sep + "batch" + path.sep + this.batchId;
    url += path.sep + "test" + path.sep + this.location;
    if (this.query) { url += "?" + this.query; }
    return url;
};

/**
 * Mark if this test has results and is considered complete.
 *
 * @method setResults
 * @param {Boolean} results True if test has results, false otherwise.
 */
Test.prototype.setResults = function (results) {
    this.results = !!results;
};

/**
 * Mark if this test is being worked on by a browser.
 *
 * @method setExecuting
 * @param {Boolean} executing True if executing, false otherwise.
 */
Test.prototype.setExecuting = function (executing) {
    this.executing = !!executing;
};

/**
 * Is this test is being worked on by a browser?
 *
 * @method isExecuting
 * @return {Boolean} True if executing, false otherwise.
 */
Test.prototype.isExecuting = function () {
    return this.executing;
};

/**
 * Determine if this is the NullTest.
 *
 * @method isNull
 * @return {Boolean} False.
 */
Test.prototype.isNull = function () {
    return false;
};

module.exports = Test;
