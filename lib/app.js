var sys = require("sys");
var assert = require("assert");
var querystring = require("querystring");
var http = require("http");

var sendfiles = require("./sendfiles").sendfiles;
var Browsers = require("./browsers").Browsers;

exports.boot = function (config) {

    serveExpress(
        config.path,
        config.port
    );

    openURL(
        config.files
    );

    console.log("Served: " + config.path);

};

function openURL (files) {
    var file = files.pop();
    var b = new Browsers.Safari();
    b.visit("http://localhost:8000/");
}

function serveExpress (path, port) {

    configure(function() {
        sys.debug(path);
        set("root", __dirname);

        use(Static, { path: path, bufferSize : 0 });

        use(require("express/plugins/body-decoder").BodyDecoder);

        enable("show exceptions");
    });

    get("/", function() {
        this.render("index.html.haml");
    });

    post("/results", function () {
        
        console.log("got results");
        this.respond(200, "ok");
    });

    get('/project/*', function(file){
        var file = path + "/" + file;

        if (/^.+\/build\/yui\/yui.*\.js$/.test(this.url.href)) {
            // inject a test reporter into YUI itself
            var url = "http://localhost:" + port + "/results";
            sendfiles.call(
                this,
                [file, require("path").normalize(__dirname + "/../inc/inject.js")],
                "window.YUITest.CLI = { url : \"" + url + "\" };"
            );
        } else {
            // everything else goes untouched
            this.sendfile(file);
        }
    });

    run(port, null);

}
