var sys = require("sys");
var http = require("http");

var sendfiles = require("./sendfiles").sendfiles;
var Browsers = require("./browsers").Browsers;

var pendingResults = 0;

exports.boot = function (config) {

    serveExpress(
        config.root,
        config.port
    );

    openURL(
        "http://localhost:" + config.port,
        config.path,
        config.files
    );

};

function openURL (base, cwd, files) {
    files.forEach(function (file) {
        var b = new Browsers.Safari();

        // no macos? use the fallback and good luck:
        if (!b.supported()) b = new Browsers.Default();

        b.visit([base, "project", cwd, file].join("/"));
        pendingResults++;
    });
    console.log("Waiting for results...");
}

function serveExpress (path, port) {

    configure(function() {
        set("root", __dirname);

        use(Static, { path: path, bufferSize : 0 });

        use(require("express/plugins/body-decoder").BodyDecoder);

        enable("show exceptions");
    });

    get("/", function() {
        this.respond(200, "all your test are belong to me");
    });

    post("/results", function () {
        var result = JSON.parse(this.params.post.results);
        console.log(result.name + ": " + result.passed + " passed, " + result.failed + " failed.");
        this.respond(200, "ok");
        if (!--pendingResults) process.exit(0);
    });

    get('/project/*', function (file) {
        var file = path + "/" + file;

        if (/^.+\/build\/yui\/yui.*\.js$/.test(this.url.href)) {
            // inject a test reporter into YUI itself
            var url = "http://localhost:" + port + "/results";
            sendfiles.call(
                this,
                [file, require("path").normalize(__dirname + "/../inc/inject.js")],
                "window.YCLI = { url : \"" + url + "\" };"
            );
        } else {
            // everything else goes untouched
            this.sendfile(file);
        }
    });

    run(port, null);

}
