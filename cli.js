#!/usr/bin/env node

"use strict";

var CLI = require("./lib/cli").CLI;

var frontend = new CLI({
    readableStream: process.stdin,
    writableStream: process.stderr,
    exitFn: process.exit,
    errorFn: console.error,
    putsFn: console.log
});

frontend.setupExceptionHandler();
frontend.route(process.argv);
