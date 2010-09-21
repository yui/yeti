var ui = require("./ui");
var server = require("./server");

var singleton = true;
var dying = false;
var ct = 0;

function KILLCB () {
    if (ct--) return;
    ui.log("All browsers disconnected.");
    process.exit(0);
}

function killServers () {
    ui.log();

    // Hitting Ctrl-C more than once?
    // Take the hint.
    if (dying) ui.exit("Forced termination.");
    dying = true;

    ui.log("Telling browsers to disconnect...");

    var ports = server.getPorts();
    ct = ports.length;
    ports.forEach(function (port) {
        var tests = server.getEmitterForPort(port);
        if (tests.listeners("shutdown").length) {
            tests.emit("shutdown", KILLCB);
        } else KILLCB();
   });
}

exports.listen = function () {
    if (!singleton) return;
    process.on("SIGINT", killServers);
    singleton = false;
};
