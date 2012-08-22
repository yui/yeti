"use strict";

/**
 * @module util
 */

var util = require("util");

/* Return a shallow copy of the given Object.
 *
 * @method util.shallowCopy
 * @param {Object} object Object to copy.
 * @return {Object} New object.
 */
util.shallowCopy = function shallowCopy(object) {
    var key,
        newObject = object.constructor();

    for (key in object) {
        newObject[key] = object[key];
    }

    return newObject;
};

module.exports = util;
