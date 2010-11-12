var vows = require("vows");
var assert = require("assert");

var cli = require("../lib/cli");

vows.describe("CLI").addBatch({
    "Configuring the app" : {
        topic : function () {
            return cli.configure({
                port : 8087,
                override : "no",
                inherit : "yes",
                argv : ["hallo", "--override=yes", "--bar=baz", "--port=8089", "reid", "--foo", "-v"]
            });
        },
        "should set an argv option without a value to true" : function (config) {
            assert.isTrue(config.foo);
        },
        "should set an argv option with a value to its value" : function (config) {
            assert.equal(config.bar, "baz");
        },
        "should inherit properties from the passed object" : function (config) {
            assert.equal(config.inherit, "yes");
        },
        "should override default option with argv option" : function (config) {
            assert.equal(config.override, "yes");
        },
        "should treat everything that isn't an option as a file" : function (config) {
            assert.length(config.files, 2);
            assert.include(config.files, "hallo");
            assert.include(config.files, "reid");
        },
        "should provide port as an integer" : function (config) {
            assert.strictEqual(config.port, 8089);
        },
        "should treat v as version" : function (config) {
            assert.ok(config.version);
        },
        "should include the path" : function (config) {
            assert.equal(config.path, process.cwd());
        },
        "should omit argv" : function (config) {
            assert.isUndefined(config.argv);
        }
    } 
}).export(module);
