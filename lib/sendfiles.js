var fs = require("fs");

// multi-file version of sendfile
exports.sendfiles = function (files, appendString, callback, options) {
    var self = this;
    var contentLength = 0;
    var filesRead = 0;
    var contentStore = [];
    var io = new (require("events").EventEmitter);

    if (!options) options = {};

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
        var expires = (
            options.cache !== false
        ) ? "Tue, 10 Mar 1989 12:20:02 GMT"
          : "Tue, 10 Mar 2020 12:20:02 GMT";
        self.header("Expires", expires);
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
