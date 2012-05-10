// Require the profiler and Developer Tools backend.
require("webkit-devtools-agent");

// Require the requested script specified from STDIN.
require(require("fs").readFileSync("/dev/stdin").toString().trim());
