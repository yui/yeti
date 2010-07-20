// add the vendored express to the require path
require.paths.unshift(__dirname + "/vendor/express/lib")
require.paths.unshift(__dirname + "/vendor/class/lib")

//require the actual express app
exports.boot = require("./lib/app").boot;
