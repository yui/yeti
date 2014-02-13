/*global task, desc, fail, complete */

"use strict";

var fs = require("fs");
var child_process = require("child_process");
var Ronn = require("ronn").Ronn;
var rimraf = require("rimraf");
var walkdir = require("walkdir");

var version = require("./lib/package-metadata").readPackageSync().version;

function nuke(f, completer) {
    rimraf(f, function (err) {
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

function getTestFiles(subdirectory) {
    var path = "test/" + subdirectory,
        jsFilter = new RegExp(".js$"),
        jsTestFiles = fs.readdirSync(path).filter(function (elem, index, arr) {
            return jsFilter.test(elem);
        }).map(function (file) {
            return path + "/" + file;
        });

    return jsTestFiles;
}

function getJsFiles(path, cb) {
    var files = [],
        jsFilter = new RegExp(".js$"),
        walker = walkdir(path, {
            follow_symlinks: false
        });

    walker.on("file", function (filename, stat) {
        if (jsFilter.test(filename)) {
            files.push(filename);
        }
    });

    walker.on("end", function () {
        cb(files);
    });
}

desc("Default: install all modules including devDependencies");
task("default", ["install"]);

desc("Install all modules including devDependencies");
task("install", function () {
    var dep = jake.Task['dep'];
    dep.addListener('complete', function () {
        spawn("npm", ["install"], complete);
    });
    dep.invoke();
}, {
    async: true
});

desc("Run all of Yeti's functional tests");
task("test-functional", function () {
    var args = ["--spec"];
    bin("vows", args.concat(getTestFiles("functional")), complete);
}, {
    async: true
});

desc("Run all of Yeti's unit tests");
task("test-unit", function () {
    var args = [];
    if (process.env.TRAVIS) {
        args.push("--spec");
    }
    bin("vows", args.concat(getTestFiles("unit")), complete);
}, {
    async: true
});

desc("Run all of Yeti's tests");
task("test", ["test-functional", "test-unit"]);

desc("Report functional test coverage as HTML");
task("coverage-functional", function () {
    spawn("bash", ["scripts/coverage.sh", "functional"], complete);
}, {
    async: true
});

desc("Report unit test coverage as HTML");
task("coverage-unit", function () {
    spawn("bash", ["scripts/coverage.sh", "unit"], complete);
}, {
    async: true
});

desc("Report test coverage as HTML");
task("coverage", ["coverage-functional", "coverage-unit"]);

function mustachify(inFile, lines, outFile) {
    var md, html, data, opts;
    opts = {
        encoding: "utf8"
    };
    data = fs.readFileSync(inFile, opts);
    // Remove header
    md = data.split("\n").slice(lines).join("\n"),
    html = new Ronn(md).html()
            .replace(/<[\/]*html>/g, "")
            .replace(/<pre>/g, '<pre class="code">');
    fs.writeFileSync(outFile, html, opts);
}

desc("Build HTML documentation");
task("html", function () {
    mustachify("README.md", 4, "doc/quick-start/index.mustache");
    mustachify("CONTRIBUTING.md", 2, "doc/contribute/index.mustache");
    spawn(process.argv[0], ["scripts/generate_selleck_project.js"], function (err) {
        if (err) { return complete(err); }
        bin("selleck", [], complete);
    });
}, {
    async: true
});

desc("Build API documentation");
task("html-api", ["html"], function () {
    jake.mkdirP('build_docs/api/everything');
    bin("yuidoc", ["--project-version", version], complete);
}, {
    async: true
});

desc("Run JSLint on all files, or a specific given file");
task("lint", function () {
    bin("jshint", ["lib", "test"], complete);
}, {
    async: true
});

desc("Remove build documentation");
task("clean", function () {
    nuke("build_docs");
    nuke("doc/yeti/project.json");
    nuke("doc/quick-start/index.mustache");
    nuke("doc/contribute/index.mustache");
});

desc("Build website");
task("site", ["clean", "html-api", "html", "coverage"]);

desc("Remove development tools");
task("maintainer-clean", function () {
    spawn("rpm", ["rm", "webkit-devtools-agent"]);
    nuke("tools");
});

desc("Fetch external dependencies for development");
task("dep", function () {
    jake.mkdirP('dep/dev');
    spawn(process.argv[0], ["./scripts/fetch_deps.js", "--dev"], complete);
}, {
    async: true
});

desc("Fetch external dependencies for release packaging");
task("release-dep", function () {
    nuke("dep", function (err) {
        if (err) { return complete(err); }
        jake.mkdirP('dep');
        spawn(process.argv[0], ["./scripts/fetch_deps.js"], complete);
    });
}, {
    async: true
});
