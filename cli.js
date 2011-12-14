#!/usr/bin/env node
var Hub = require("./lib/hub");

var server = new Hub();
server.listen(8090, function () {
    console.log("Yeti Hub listening on port 8090.");
});
