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
        "!DOCTYPE",
        ".*",
        "(/?)", // self-closing
        ">"
    ].join("\\s*"),
    "i"
);

TestServer.prototype.inject = function (buffer) {
    var html = buffer.toString("utf8"),
        match = this.tag.exec(html),
        // Adding to the top of the page, if  DOCTYPE tag was not found.
        index = match ? match.index + match[0].length : 0;
    return new Buffer(html.slice(0, index) +
            this.payload + html.slice(index), "utf8");
};

TestServer.prototype.serve = function (server, filename, buffer) {

    var injectScript = false,
        now = new Date(),
        headers = {
            Date: now.toUTCString()
        };

    // Cache for 4 minutes.
    headers.Expires = (new Date(now.getTime() + 240000)).toUTCString();

    headers["Content-Type"] = mime.contentTypes[path.extname(filename).slice(1)] ||
        "application/octet-stream";

    switch (headers["Content-Type"]) {
    case "text/html":
        injectScript = true;
        headers["Content-Type"] += "; charset=utf-8";
        break;
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
