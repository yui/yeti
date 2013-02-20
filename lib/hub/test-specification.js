"use strict";

/**
 * TestSpecification details information about tests in a Test
 * that need to be relayed to a given Target.
 *
 * @class TestSpecification
 * @constructor
 * @param {Object} spec From `Client.createBatch()`.
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
    this.tests = spec.tests;
    this.query = spec.query;
    this.basedir = spec.basedir;
    this.timeout = spec.timeout;
    this.useProxy = spec.useProxy;

    this.mountpount = "";
}

TestSpecification.prototype.setMountpoint = function (mountpoint) {
    this.mountpoint = mountpoint;
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

module.exports = TestSpecification;
