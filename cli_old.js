#!/usr/bin/env node

var config = require("./lib/old/cli").configure({
    port : 8000,
    argv : process.argv.splice(2)
});

if (config.error && config.usage) {
    console.error(config.usage);
    console.error(config.error);
    process.exit(1);
}

require("./lib/old/app").boot(config);
