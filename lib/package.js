var fs = require("fs");
var path = require("path");

var cache;

exports.readPackageSync = function () {
    if (!cache) cache = JSON.parse(
        fs.readFileSync(
            path.join(
                __dirname, "..", "package.json"
            )
        ) + ""
    );
    return cache;
}
