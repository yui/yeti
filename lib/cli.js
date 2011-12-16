var nopt = require("nopt");
var winston = require("winston");

var pkg = require("./package");
var Hub = require("./hub");

var parseArgv = function (argv) {
    var knownOptions = {
        "server": Boolean,
        "version": Boolean,
        "port": Number,
        "help" : Boolean
    };

    var shortHands = {
        "s": ["--server"],
        "p": ["--port"],
        "v": ["--version"]
    };

    // These should be exports, use a different file.

    return nopt(knownOptions, shortHands, argv);
};

var CLI = module.exports = function CLI () {
    this.log = new winston.Logger({
        transports: [
            new (winston.transports.Console)()
        ]
    });
    this.log.cli();
    this.log.extend(this);
}

CLI.prototype.route = function (argv) {
    var options = parseArgv(argv);
    var self = this;

    function printUsage () {
        self.info("usage: " + argv[1] +
                " [--version | -v] [--server | -s] [--port=<n>]" +
                " [--help] [--] [<HTML files>]");
    }

    if (options.server) {
        var server = new Hub();
        server.listen(8090, function () {
            self.info("Yeti Hub listening on port 8090.");
        });
    } else if (options.argv.remain.length) {
        var files = options.argv.remain;
        self.info("Looks like you'd like to run some files:" + files.join(", "));
        self.warn("Not implemented yet.");
    } else if (options.version) {
        self.info(pkg.readPackageSync().version);
    } else if (options.help) {
        printUsage();
    } else {
        printUsage();
        self.info("No files specified. To launch the Yeti server, specify --server.");
        process.exit(1);
    }
};

