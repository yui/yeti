var ui = require("./ui");
var Browsers = require("./browsers").Browsers;

function composeURLs (base, cwd, files) {
    var urls = [];
    files.forEach(function (file) {
        if ("/" == file[0]) file = file.substr(1);
        urls.push([base, cwd, file].join("/"));
    });
    return urls;
};

function visit (browsers, urls) {
    ui.start();
    urls.forEach(function (url) {
        var fallback = false;
        browsers.forEach(function (browser) {
            // ucfirst
            browser = browser[0].toUpperCase() + browser.substr(1).toLowerCase();
            if (Browsers[browser]) {
                var b = new Browsers[browser];
                if (!b.supported()) {
                    ui.log(browser + " is not available on this platform.");
                }
            } else {
                ui.log(browser + " is not supported.");
                return;
            }

            b.visit(url);

            ui.pending();
        });
    });
}

exports.composeURLs = composeURLs;
exports.visit = visit;
