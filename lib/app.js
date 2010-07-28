var ui = require("./ui");
var visitor = require("./visitor");
var server = require("./server");
var http = require("./http");

exports.boot = function (config) {

    ui.verbose(config.verbose);

    if (
        !config.browsers
    ) config.browsers = require("./browsers").Browsers.canonical();

    config.browsers = config.browsers.split(",");

    fromConfiguration(config);

};

function fromConfiguration (config) {
    var d = {
        host : "localhost",
        port : config.port
    };

    d.method = "PUT";
    d.path = "/tests/add";
    d.body = { tests : visitor.composeURLs(
        "",
        config.path,
        config.files
    ) };
    var req = http.request(d);

    req.on("response", function (res, id) {
        ui.debug("Batch registered:", id);
        d.method = "GET";
        d.path = "/status/" + id;
        (function moreResults () {
            http.request(d).on("response", function (res, result) {
                if (res.statusCode === 200) {
                    ui.results(result);
                    moreResults();
                } else {
                    ui.exit("The server says: " + result);
                }
            });
        })();
    });

    req.on("error", function () {
        server.fromConfiguration(config);
    });
}

exports.fromConfiguration = fromConfiguration;
