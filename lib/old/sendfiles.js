var fs = require("fs");

// A multi-file version of sendfile.
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
        if (!err) self.contentType(file);
        // handle images and such.
        if (contentStore.length == 1) return self.send(contentStore[0], 200);
        self.send(contentStore.join("\n"), 200);
    });

    var len = files.length, err;

    function done (err, file) {
        if (err) err = true;
        if (
            ++filesRead == len
        ) io.emit("end", file);
    }

    // The order of files is important
    for (
        var idx = 0; idx < len; idx++
    ) (function (idx) { // closure on idx
        var file = files[idx];
        fs.stat(file, function (err, stat) {
            if (err) return done(err, file); // TODO handle this
            fs.readFile(file, function (err, content) {
                if (err) return done(err, file); // TODO handle this
                contentStore[idx] = content;
                contentLength += stat.size;
                done(err, file);
            })
        })
    })(idx);

    return this;
}
