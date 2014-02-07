"use strict";

var path = require("path");
var fs = require("fs");

var pkg = fs.readFileSync(path.join(__dirname, "../package.json"), {
    encoding: "utf8"
});
var tpl = fs.readFileSync(path.join(__dirname, "../doc/yeti/project.json.tpl"), {
    encoding: "utf8"
});

pkg = JSON.parse(pkg);

fs.writeFileSync(path.join(__dirname, "../doc/yeti/project.json"), tpl.replace(/@VERSION@/g, pkg.version));
