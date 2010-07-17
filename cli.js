#!/usr/bin/env node

var ui = require("./lib/ui");

function mandatory (ok, msg) {
    if (ok) return;
    ui.log(ui.color.red("Error") + ": " + msg);
    process.exit(1);
}

function main (config) {
    mandatory(
        config.files.length,
        "At least one testfile is required. Hint: you can specify many!"
    );

    config.root = "/";
    config.path = process.cwd().substr(1);

    require("./server").boot(config);
}

main({
    port : parseInt(process.env.PORT) || 8000,
    files : process.argv.slice(2)
});
