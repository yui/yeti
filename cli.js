#!/usr/bin/env node
var CLI = require("./lib/cli");

var interface = new CLI();

interface.route(process.argv);
