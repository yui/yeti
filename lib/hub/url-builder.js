"use strict";

var path = require('path');

module.exports = function makeURLFromComponents(mountpoint, agentId, batchId, test) {
    var url = mountpoint;

    if (url !== path.sep) {
        // XXX So hacky.
        url += path.sep;
    }

    url += "agent" + path.sep + agentId;

    if (test && batchId) {
        // XXX if test is true,
        // batchId should always be set
        url += path.sep + "batch" + path.sep + batchId;
        url += path.sep + "test" + path.sep + test;
    }

    return url;
};
