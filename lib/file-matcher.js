"use strict";

/**
 * @module file-matcher
 */

var path = require("path");
var minimatch = require("minimatch");

/**
 * @constructor
 * @class FileMatcher
 * @param {Object} options
 * @param {String} options.extension Require file extenstion for matching.
 * @param {Array} options.excludes Array of string patterns for exclusion.
 *                                 Patterns matched with http://npm.im/minimatch
 */
function FileMatcher(options) {
    this.extension = options.extension;
    this.excludes = options.excludes || [];

    this.matchers = this.createMatchers();
}

/**
 * @method createMatchers
 * @private
 */
FileMatcher.prototype.createMatchers = function () {
    return this.excludes.map(function (pattern) {
        return function (file) {
            return !minimatch(file, pattern);
        };
    });
};

/**
 * @method match
 * @param {String} file
 * @return {Boolean} True if file matches extension and does not match optional excludes.
 */
FileMatcher.prototype.match = function (file) {
    if (path.extname(file).slice(1) !== this.extension) {
        return false;
    }

    return this.matchers.every(function (fn) {
        return fn(file);
    });
};

module.exports = FileMatcher;
