var fs = require("fs");
var execute = require("child_process").exec;
var ronn = require("ronn").Ronn;
var version = require("./lib/package").readPackageSync().version;
var rimraf = require("rimraf");
var walk = require("walk");

function exec(command, onComplete) {
    execute(command, function (err, stdout, stderr) {
        if (typeof(onComplete) !== "function" && stdout) {
            console.log(stdout);
        }
        if (stderr) {
            console.log(stderr);
        }
        if (typeof(onComplete) === "function") {
            onComplete(stdout);
        }
    });
}

function getTestFiles(path) {
    var jsFilter = new RegExp(".js$"),
        jsTestFiles = fs.readdirSync(path).filter(function(elem, index, arr) {
            return jsFilter.test(elem);
        });

    return jsTestFiles;
}

function getJsFiles(path, cb) {
    var files = [],
        jsFilter = new RegExp(".js$");
        walker = walk.walk(path, { followLInks: false });

    walker.on("file", function(root, stat, next) {
        if (jsFilter.test(stat.name)) {
            files.push(root + "/" + stat.name);
        }
        next();
    });

    walker.on("end", function() {
        cb(files);
    }); 
}

desc("Default: install all modules including devDependencies");
task("default", function () {
    exec("npm install .");       
});

desc("Install all modules including devDependencies");
task("install", function () {
    exec("npm install .");
});

desc("Run all of Yeti's unit tests");
task("test", function () {
    // RegExp for JavaScript test files (used for Windows compatibility)
    var index, jsTestFiles = getTestFiles("test");

    for (index = 0; index < jsTestFiles.length; index++) {
        exec("node node_modules/vows/bin/vows test/" + jsTestFiles[index],
            { customFds: [0,1,2] });
    }
});

desc("Run all of Yeti's unit tests with the '--spec' flag");
task("spec", function () {
    var index, jsTestFiles = getTestFiles("test");

    for (index = 0; index < jsTestFiles.length; index++) {
        exec("node node_modules/vows/bin/vows --spec test/" + jsTestFiles[index],
            { customFds: [0,1,2] });
    }
});

desc("Build coverage tools and write out test coverage HTML page");
task("coverage", function () {
    // nodejs-coverage may not work well on Windows so just use the original
    exec("scripts/coverage.sh");
});

desc("Build HTML documentation");
task("html", function() {
    fs.readFile("README.md", function (err, data) {
        // Remove Travis info
        var markdown = data.toString().substr(124);
        var html = new ronn(markdown).html();
        var moddedHtml = html.replace(/<[\/]*html>/, "")
                             .replace("<pre>", '<pre class="code"');
        fs.writeFileSync("doc/quick-start/index.mustache", moddedHtml);
        exec("node node_modules/selleck/bin/selleck");
    });
});

desc("Build API documentation");
task("html-api", ["html"], function () {
    exec("node node_modules/yuidocjs/lib/cli.js --project-version " + version);
});

desc("Run JSLint on all files, or a specific given file");
task("lint", function () {
    getJsFiles("./lib", function (files) {
        exec("node node_modules/jshint/bin/hint " + files.join(" "));
    });
});

desc("Remove build documentation");
task("clean", function () {
    rimraf("build_docs", function (err) {
        if (err) { 
            console.log(err); 
        }
    });
});

desc("Remove development tools");
task("maintainer-clean", function () {
    exec("npm rm webkit-devtools-agent");
    rimraf("tools", function (err) {
        if (err) {
            console.log(err);
        }
    });
});
