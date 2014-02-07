#!/usr/bin/env node

"use strict";

var fs = require("fs"),
    path = require("path"),
    existsSync = fs.existsSync || path.existsSync;

// Avoid fetching deps if possible. See GH-42.
if (!fs.existsSync(path.join(__dirname, "..", "dep"))) {
    require("./fetch_deps");
}
