"use strict";

var path = require("path");
var util = require("util");
var fs = require("graceful-fs");
var Onyx = require("onyx").Onyx;

/**
 * **Beryl** is a library for streaming
 * files over HTTP that allows for
 * dynamic injection of tags in HTML files.
 *
 * @class Beryl
 * @extends Onyx
 * @constructor
 */
function Beryl(payload) {
    this.payload = payload;
    Onyx.call(this);
}

util.inherits(Beryl, Onyx);

Beryl.prototype.tag = new RegExp(
    [
        "\\s*",
        "<",
        "script",
        ".*",
        "(/?)", // self-closing
        ">"
    ].join("\\s*"),
    "i"
);

/**
 * Determines if a given filename has a HTML extension.
 *
 * @method isHTML
 * @private
 * @param {String} file File to check.
 * @return {Boolean} True if HTML, false otherwise.
 */
Beryl.prototype.isHTML = function (file) {
    return path.extname(file).indexOf(".htm") === 0;
};

/**
 * Injects the payload into the given HTML document.
 *
 * @method inject
 * @private
 * @param {String} html HTML document.
 * @param {String} Modified HTML document.
 */
Beryl.prototype.inject = function inject(html) {
    var match = this.tag.exec(html),
        // Append to the end if no match was found.
        index = match ? match.index : html.length;
    return html.slice(0, index) + this.payload + html.slice(index);
};

/**
 * Implementation of the actual file transfer.
 */
Beryl.prototype.xfer = function xfer(res, files, cb) {
    var self = this,
        readStream,
        file = files.shift();

    if (!file) {
        return cb(null);
    }

    function xferClose() {
        self.xfer(res, files, cb);
    }

    if (self.isHTML(file)) {
        // HTML document
        // inspect tags
        fs.readFile(file, "utf8", function (err, html) {
            if (err) {
                return cb(err);
            }
            res.write(self.inject(html), "utf8");
            xferClose();
        });
    } else {
        // simple case
        readStream = fs.createReadStream(file);
        readStream.on("data", function (chunk) {
            res.write(chunk);
        });
        readStream.on("error", cb);
        readStream.on("close", xferClose);
    }
};

/**
 * Aggregate fs#stat across multiple files.
 *
 * The callback recieves an object with:
 *
 * - size: total size of all files
 * - mtime: latest mtime
 * - files: individual stat objects per-file
 *
 * This override modifies the stat(1) information
 * for HTML files to allow for the payload length.
 *
 * The payload is injected later with xfer.
 *
 * @method mstat
 * @override
 * @param {Array} files
 * @param {Function} cb Callback
 */

var mstat = Onyx.prototype.mstat;

Beryl.prototype.mstat = function (files, cb) {
    var self = this,
        payloadLength = self.payload.length;
    // Override the callback function.
    mstat.call(this, files, function (err, stat) {
        // For HTML files, add the length of
        // the payload to the file size.
        var htmlFiles = Object.keys(stat.files).filter(function (filename) {
            return self.isHTML(filename);
        });
        htmlFiles.forEach(function (filename) {
            stat.files[filename].size += payloadLength;
        });
        // Add the length of all HTML payloads.
        stat.size += payloadLength * htmlFiles.length;
        cb(err, stat);
    });
};

/**
 * For a given baton containing stats, files, and
 * a HTTP response, stream them to the HTTP response
 * and callback when complete.
 *
 * @method stream
 * @override
 * @param {Object} baton The baton, containing files, res, and stat.
 * @param {Function} cb Callback, 1-arity, the error or null.
 */
Beryl.prototype.stream = function stream(baton, cb) {
    var res = baton.res,
        files = baton.files.slice(0);

    this.xfer(res, files, cb);
};

module.exports = Beryl;
