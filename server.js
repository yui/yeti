// add the vendored express to the require path
require.paths.unshift(__dirname + "/vendor/express/lib")
require.paths.unshift(__dirname + "/vendor/express/support/connect/lib")
require.paths.unshift(__dirname + "/vendor/express/support/connect-form/lib")
require.paths.unshift(__dirname + "/vendor/express/support/ejs/lib")
require.paths.unshift(__dirname + "/vendor/express/support/expresso/lib")
require.paths.unshift(__dirname + "/vendor/express/support/haml/lib")
require.paths.unshift(__dirname + "/vendor/express/support/jade/lib")
require.paths.unshift(__dirname + "/vendor/class/lib")

//require the actual express app
exports.boot = require("./lib/app").boot;
