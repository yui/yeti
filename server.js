// add the vendored express to the require path
require.paths.unshift(__dirname + "/vendor/express/lib")

// require express and its plugins
require("express")
require("express/plugins")

//require the actual express app
exports.boot = require("./lib/app").boot;
