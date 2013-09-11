"use strict";

var os = require("os");

var BUILD_TAG = process.env.BUILD_TAG;
var sessionCount = 0;

function getSessionName() {
    sessionCount += 1;
    return [BUILD_TAG || "Automated", "Browser", sessionCount,
           "from", os.hostname()].join(" ");
}

function lookupBrowserPart(knownNames, str) {
    var out = {
        type: false,
        match: false,
        dup: false
    };

    str = str.toLowerCase();

    Object.keys(knownNames).forEach(function (type) {
        knownNames[type].some(function (candidate) {
            var exactMatch;
            candidate = candidate.toLowerCase();
            if (candidate.indexOf(str) === 0) {
                exactMatch = candidate === str;
                if (exactMatch || !out.match) {
                    if (candidate === "ie") {
                        candidate = "internet explorer";
                    }
                    out.match = candidate;
                    out.type = type;
                    if (exactMatch) {
                        out.dup = false;
                        return true;
                    }
                } else {
                    out.dup = true;
                }
            }
        });
    });

    return out;
}

function parseBrowsers(browsers) {
    var knownNames = {
            "browserName": [
                "Chrome",
                "Firefox",
                "Safari",
                "IE", // expands to "Internet Explorer" in lookupBrowserPart
                "iPad", // Sauce
                "iPhone", // Sauce
                "Android",
                "Opera",
                "PhantomJS"
            ],
            "platform": [
                "Windows XP", // Sauce
                "Windows 7", // Sauce
                "Windows 8", // Sauce
                "OS X 10.6", // Sauce
                "OS X 10.8", // Sauce
                "Windows 2003", // Legacy Sauce
                "Windows 2008", // Legacy Sauce
                "Windows 2012", // Legacy Sauce
                "Mac 10.6", // Legacy Sauce
                "Mac 10.8", // Legacy Sauce
                "WINDOWS",
                "XP",
                "Mac",
                "Linux",
                "Vista"
            ]
        },
        requestedCapabilities = [];

    if (!browsers || !browsers.length) {
        return;
    }

    browsers.forEach(function (parts) {
        var capability = {};

        parts.split("/").forEach(function (part) {
            var lookup = lookupBrowserPart(knownNames, part),
                match = lookup.match;
            if (lookup.dup) {
                throw new Error("Ambigious " + lookup.type + " " + part);
            } else if (lookup.match) {
                if (lookup.type === "platform") {
                    match = match.toUpperCase();
                } else {
                    match = match.toLowerCase();
                }
                capability[lookup.type] = match;
            } else if (part === "latest" || !isNaN(Number(part[0]))) {
                capability.version = part;
            }
        });
        if (Object.keys(capability)) {
            capability.name = getSessionName();

            if (BUILD_TAG) {
                capability.build = BUILD_TAG;
            }

            requestedCapabilities.push(capability);
        }
    });

    return requestedCapabilities;
}

module.exports = parseBrowsers;
