"use strict";

/**
 * @module reporter-coverage-summary
 */

/*
 * Portions of this file were taken from code written
 * by Krishnan Anantheswaran for the Istanbul project.
 * https://github.com/gotwarlost/istanbul/blob/c469986b713a725296939b2ad71b7b726fc6644e/lib/report/text-summary.js
 * Copyright 2013 Yahoo! Inc., used under the BSD license.
 */

var util = require("util");
var istanbul;

var Reporter = require("./reporter");

/**
 * @class CoverageSummaryReporter
 * @constructor
 * @extends Reporter
 */
function CoverageSummaryReporter(options) {
    Reporter.call(this, options);

    try {
        istanbul = require("istanbul");
    } catch (ex) {
        throw new Error("Unable to summarize coverage unless Istanbul is installed");
    }

    this.collector = new istanbul.Collector();

    this.complete = false;
}

util.inherits(CoverageSummaryReporter, Reporter);

CoverageSummaryReporter.prototype.bindEvents = function () {
    this.batch.on("agentResult", this.handleAgentResult.bind(this));
    this.batch.once("complete", this.handleComplete.bind(this));
    this.batch.once("end", this.handleEnd.bind(this));
};

CoverageSummaryReporter.prototype.handleAgentResult = function (agent, details) {
    if (details.coverage) {
        this.collector.add(details.coverage);
    }
};

function lineForKey(summary, key, watermarks) {
    var metrics = summary[key],
        skipped,
        result;
    key = key.substring(0, 1).toUpperCase() + key.substring(1);
    if (key.length < 12) { key += "                   ".substring(0, 12 - key.length); }
    result = [ key, ":", metrics.pct + "%", "(", metrics.covered + "/" + metrics.total, ")"].join(" ");
    skipped = metrics.skipped;
    if (skipped > 0) {
        result += ", " + skipped + " ignored";
    }
    return result;
}

CoverageSummaryReporter.prototype.handleComplete = function () {
    var self = this,
        summaries = [],
        finalSummary;

    self.collector.files().forEach(function (file) {
        summaries.push(istanbul.utils.summarizeFileCoverage(self.collector.fileCoverageFor(file)));
    });
    finalSummary = istanbul.utils.mergeSummaryObjects.apply(null, summaries);

    this.cli.puts([
        "Coverage summary:",
        lineForKey(finalSummary, "statements"),
        lineForKey(finalSummary, "branches"),
        lineForKey(finalSummary, "functions"),
        lineForKey(finalSummary, "lines")
    ].join("\n"));
    this.complete = true;
};

CoverageSummaryReporter.prototype.handleEnd = function () {
    if (!this.complete) { this.handleComplete(); }
    this.emit("end");
};

module.exports = CoverageSummaryReporter;
