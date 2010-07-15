var sys = require("sys");
var assert = require("assert");
var querystring = require("querystring");
var http = require("http");
var EventEmitter = require("events").EventEmitter;

exports.boot = function (config) {

    setup(config.path);

    run(parseInt(process.env.PORT || 8000), null);

};

function setup (path) {

    configure(function() {
        sys.debug(path);

        set("root", __dirname);
        use(Static, { path: path });
        enable("show exceptions");
    });

    get("/", function() {
        this.render("index.html.haml");
    });

}
