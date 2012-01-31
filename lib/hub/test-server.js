"use strict";

var mime = require("./mime");
var path = require("path");

function TestServer(payload) {
    this.payload = payload;
}

TestServer.prototype.tag = new RegExp(
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

TestServer.prototype.inject = function (buffer) {
    var html = buffer.toString("utf8"),
        match = this.tag.exec(html),
        // Append to the end if no match was found.
        index = match ? match.index : html.length;
    return html.slice(0, index) + this.payload + html.slice(index);
};

TestServer.prototype.serve = function (server, filename, buffer) {

    var injectScript = false,
        headers = {
            Date: (new Date()).toUTCString()
        };

    // XXX: Zero caching.
    headers["Last-Modified"] = headers.Date;

    headers["Content-Type"] = mime.contentTypes[path.extname(filename).slice(1)]
        || "application/octet-stream";

    switch (headers["Content-Type"]) {
    case "text/html":
        injectScript = true;
    case "application/javascript":
    case "application/xml":
    case "text/css":
    case "text/plain":
        headers["Content-Type"] += "; charset=utf-8";
        break;
    }

    if (injectScript) {
        buffer = this.inject(buffer);
    }

    headers["Content-Length"] = buffer.length;

    server.res.writeHead(200, headers);

    if (server.req.method === "HEAD") {
        server.res.end();
        return;
    }

    server.res.end(buffer);
};

module.exports = TestServer;
