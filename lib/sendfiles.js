var fs = require("fs");

// never-caching multi-file version of sendfile
exports.sendfiles = function (files, appendString, callback) {
    var self = this;
    var contentLength = 0;
    var filesRead = 0;
    var contentStore = [];
    var io = new (require("events").EventEmitter);

    if (
        appendString && "string" !== typeof appendString
    ) return Error.raise("TypeError", "appendString must be a string");

    io.addListener("end", function (file) {
        if (appendString) {
            contentLength += appendString.length;
            contentStore.push(appendString);
        }
        contentLength += contentStore.length - 1;
        self.header("Content-Length", contentLength);
        self.header("Expires", "Tue, 10 Mar 1989 12:20:02 GMT");
        // send the last file's content type.
        self.contentType(file);
        // handle images and such.
        if (contentStore.length == 1) return self.send(contentStore[0], 200);
        self.send(contentStore.join("\n"), 200);
    });

    // the order of files is important
    for (
        var idx = 0, len = files.length; idx < len; idx++
    ) (function (idx) { // closure on idx
        var file = files[idx];
        fs.stat(file, function (err, stat) {
            if (err)
                return "errno" in err && err.errno === 2
                    ? self.send(404)
                    : self.error(err, callback);
            fs.readFile(file, function (err, content) {
                if (err) return self.error(err, callback);
                contentStore[idx] = content;
                contentLength += stat.size;
                if (
                    ++filesRead == files.length
                ) io.emit("end", file);
            })
        })
    })(idx);

    return this;
}
