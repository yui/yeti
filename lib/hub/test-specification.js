"use strict";

var Tests = require("./tests");

/**
 * TestSpecification details information about tests in a Test
 * that need to be relayed to a given Target.
 *
 * @class TestSpecification
 * @constructor
 * @param {Object} spec From `Client.createBatch()`.
 * @param {Number} spec.batchId Batch ID.
 * @param {String[]} spec.tests Tests. Either relative paths to `spec.basedir` or URL pathnames.
 * @param {String} [spec.basedir] Root path for serving tests. Required if `useProxy` is true or not provided.
 * @param {String} [spec.query] Query string additions for test URLs.
 * @param {Number} [spec.timeout] Per-test timeout in seconds. Default is 45 seconds.
 *                                  If no activity occurs before the timeout, the next test is loaded.
 * @param {Boolean} [spec.useProxy] True if tests are filenames to proxy to the Hub.
 *                           false if they are literal URL pathnames.
 *                           If not provided, defaults to true.
 */
function TestSpecification(spec) {
    this.batchId = spec.batchId;
    this.tests = spec.tests;
    this.query = spec.query;
    this.basedir = spec.basedir;
    this.timeout = spec.timeout || TestSpecification.DEFAULT_TIMEOUT;
    this.useProxy = spec.useProxy;

    this.mountpount = this.setMountpoint(spec.mountpoint);
}

TestSpecification.DEFAULT_TIMEOUT = 45;

/**
 * Creates a new TestSpecification with no tests.
 * This is used by `Batch.destroy()` to return browsers to the capture page.
 *
 * @method empty
 * @static
 * @return {TestSpecification} Empty TestSpecification.
 */
TestSpecification.empty = function () {
    return new TestSpecification({
        tests: []
    });
};

TestSpecification.prototype.setMountpoint = function (mountpoint) {
    if (!mountpoint) {
        mountpoint = "/";
    } else if (mountpoint === "" || mountpoint[mountpoint.length - 1] !== "/") {
        mountpoint += "/";
    }
    this.mountpoint = mountpoint;
};


/**
 * Get the timeout in milliseconds.
 *
 * @method getTimeoutMilliseconds
 * @return {Number} Timeout in milliseconds.
 */
TestSpecification.prototype.getTimeoutMilliseconds = function () {
    return this.timeout * 1000;
};

/**
 * Creates an array of tests for a Target.
 *
 * TODO: This should create Test objects for the Target
 * that can retain test results.
 *
 * @method createURLs
 * @return {String[]} Array of URLs.
 */
TestSpecification.prototype.createURLs = function () {
    var urls = [],
        query = this.query;

    if (query) {
        query = "?" + query;
    } else {
        query = "";
    }

    if (this.useProxy) {
        this.tests.forEach(function (test) {
            urls.push(test + query);
        });
    } else {
        // Get a copy of the tests, not a reference.
        urls = this.tests.slice();
    }

    return urls;
};

TestSpecification.prototype.createTests = function () {
    return new Tests(this);
};

module.exports = TestSpecification;
