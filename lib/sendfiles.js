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
        self.header('Content-Length', contentLength);
        // send the last file's content type.
        self.contentType(file);
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
                    ? self.notFound()
                    : self.error(err, callback)
            fs.readFile(file, function (err, content) {
                if (err) return self.error(err, callback)
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
