#!/usr/bin/env node

require("./lib/app").boot(
    require("./lib/cli").configure({
        port : 8000,
        argv : process.argv.slice(2)
    })
);
