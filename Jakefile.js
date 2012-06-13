/*global task, desc, fail, complete */

"use strict";

var fs = require("fs");
var child_process = require("child_process");

var Ronn = require("ronn").Ronn;
var rimraf = require("rimraf");
var walk = require("walk");

var version = require("./lib/package").readPackageSync().version;

function nuke(dir, completer) {
    rimraf(dir, function (err) {
        if (err) {
            fail(err);
        } else if ("function" === typeof completer) {
            completer();
        }
    });
}

function spawn(command, args, completer) {
    child_process.spawn(command, args, {
        stdio: "inherit",
        customFds: [0, 1, 2]
    }).on("exit", function (code) {
        if (code !== 0) {
            fail(command + " " + args.join(" ") +
                " failed with " + code);
        } else if ("function" === typeof completer) {
            completer();
        }
    });
}

function bin(name, args, completer) {
    if (!args) {
        args = [];
    }
    spawn("node", ["node_modules/.bin/" + name].concat(args), completer);
}

function getTestFiles() {
    var path = "test",
        jsFilter = new RegExp(".js$"),
        jsTestFiles = fs.readdirSync(path).filter(function (elem, index, arr) {
            return jsFilter.test(elem);
        }).map(function (file) {
            return "test/" + file;
        });

    return jsTestFiles;
}

function getJsFiles(path, cb) {
    var files = [],
        jsFilter = new RegExp(".js$"),
        walker = walk.walk(path, {
            followLinks: false
        });

    walker.on("file", function (root, stat, next) {
        if (jsFilter.test(stat.name)) {
            files.push(root + "/" + stat.name);
        }
        next();
    });

    walker.on("end", function () {
        cb(files);
    });
}

desc("Default: install all modules including devDependencies");
task("default", ["install"]);

desc("Install all modules including devDependencies");
task("install", function () {
    spawn("npm", ["install"], complete);
}, {
    async: true
});

desc("Run all of Yeti's unit tests");
task("test", function () {
    bin("vows", getTestFiles(), complete);
}, {
    async: true
});

desc("Run all of Yeti's unit tests with the '--spec' flag");
task("spec", function () {
    bin("vows", ["--spec"].concat(getTestFiles()), complete);
}, {
    async: true
});

desc("Build coverage tools and write out test coverage HTML page");
task("coverage", function () {
    spawn("bash", ["scripts/coverage.sh"], complete);
}, {
    async: true
});

desc("Build HTML documentation");
task("html", function () {
    fs.readFile("README.md", "utf8", function (err, data) {
        var md, html;
        // Remove Travis info
        md = data.split("\n").slice(4).join("\n"),
        html = new Ronn(md).html()
                .replace(/<[\/]*html>/, "")
                .replace("<pre>", '<pre class="code"');
        fs.writeFileSync("doc/quick-start/index.mustache", html);
        bin("selleck", [], complete);
    });
}, {
    async: true
});

desc("Build API documentation");
task("html-api", ["html"], function () {
    bin("yuidoc", ["--project-version", version], complete);
}, {
    async: true
});

desc("Run JSLint on all files, or a specific given file");
task("lint", function () {
    getJsFiles("./lib", function (files) {
        bin("jshint", files, complete);
    });
}, {
    async: true
});

desc("Remove build documentation");
task("clean", function () {
    nuke("build_docs");
});

desc("Remove development tools");
task("maintainer-clean", function () {
    spawn("rpm", ["rm", "webkit-devtools-agent"]);
    nuke("tools");
});
