"use strict";

var os = require("os");

var BUILD_TAG = process.env.BUILD_TAG;
var sessionCount = 0;

function getSessionName() {
    sessionCount += 1;
    return [BUILD_TAG || "Automated", "Browser", sessionCount,
           "from", os.hostname()].join(" ");
}

module.exports = function parseCaps(inputCaps) {
    var parsed = [];

    if (!inputCaps) {
        return parsed;
    }

    inputCaps.forEach(function (inputCap) {
        var cap = {};

        inputCap.split(";").forEach(function (setting) {
            setting = setting.split("=");
            if (setting.length === 2) {
                cap[setting[0]] = setting[1];
            }
        });

        if (Object.keys(cap)) {
            if (!cap.browserName) {
                cap.browserName = "";
            }

            cap.name = getSessionName();

            if (BUILD_TAG) {
                cap.build = BUILD_TAG;
            }

            parsed.push(cap);
        }
    });

    return parsed;
};
