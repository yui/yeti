# Tired of testing? Yeti can help.

[![Build Status](https://secure.travis-ci.org/yui/yeti.png?branch=master)](http://travis-ci.org/yui/yeti) [![npm Version](https://badge.fury.io/js/yeti.png)](http://badge.fury.io/js/yeti) [![Dependency Status](https://david-dm.org/yui/yeti.png)](https://david-dm.org/yui/yeti)

Yeti automates tests written for various test frameworks.
Yeti scales from your dev box (where it works by itself)
to your CI system (where it launches browsers with Selenium)
without changing your existing tests.

## Features

 - Works with the frameworks you already use.
 - Automates tests without any additional software. Selenium not required!
 - Built-in code coverage provided by [Istanbul][].
 - Works with IE 6+, Android 4+, Firefox, Safari, Chrome, iOS 4+.
 - Server-side AJAX testing with [echoecho][ee].
 - JUnit XML output makes Yeti play nice with Jenkins.
 - Workload can be split across multiple instances of the same browser.
 - Optional Selenium/WebDriver browser launching. Works great with Sauce Labs.

## Test Frameworks

You can use any of these test frameworks with Yeti.

 - [QUnit][]
 - [Jasmine][]
 - [Mocha][] with [Expect.js][] assertions
 - [Dojo Objective Harness][DOH]
 - [YUI Test][yuitest]
 - Your framework here. Submit a pull request!

## Install Yeti

    npm install -g yeti

Yeti requires Node.js, which provides the `npm` command for installation.
You can [download Node.js](http://nodejs.org/download/) source or pre-built
installers from their website.

## Using Yeti

Just run Yeti with the HTML files containing your tests.

    $ yeti test/*.html
    Creating a Hub at http://localhost:9000
    Waiting for agents to connect at http://localhost:9000.
    When ready, press Enter to begin testing.

Point your browsers at that URL, then come back and press Enter.

    [Open some browsers...]

      Agent connected: Safari (6.0) / Mac OS
      Agent connected: Chrome (22.0.1221.0) / Mac OS

    [Come back, press Enter]

    ✔ Testing started on Safari (6.0) / Mac OS, Chrome (22.0.1221.0) / Mac OS
    ✔ Agent completed: Safari (6.0) / Mac OS
    ✔ Agent completed: Chrome (22.0.1221.0) / Mac OS
    504 tests passed! (9.1 seconds)
    $

#### Exit status codes

Yeti exits automatically when all tests complete. If test failures occur, Yeti will exit with a non-zero status code.

- `0` indicates testing was completed and all tests passed.
- `1` indicates an error occurred that prevented testing from running to completion.
- `3` indicated testing was completed but some tests failed.

These codes are useful for using Yeti programmatically. The codes `0` and `3` indicate testing completion.
If Yeti ended in code `1`, you may wish to retry the command to workaround transient errors. This is useful
when using Yeti to launch browsers in CI, which sometimes may fail due to temporary Selenium issues.

#### JUnit XML output

Yeti can output machine-readable JUnit XML suitable for use in [Jenkins][] with the `--junit` option.

    $ yeti --junit test/*.html > yeti.xml

Yeti will output XML on stdout and status messages on stderr.

When using Yeti several times in the same Jenkins job, it's useful to label tests with a prefix
to distinguish between different Yeti runs after Jenkins merges the reports together. You can
assign this prefix with the `--name` option.

    $ yeti --name stable --junit test/stable/*.html > stable.xml
    $ yeti --name flaky --junit test/flaky/*.html > flaky.xml

#### Code coverage

Yeti can generate a code coverage report with the `-c` or `--coverage` option.

    $ yeti -c
    Found 1 file to test.
      Agent connected: Chrome (34.0.1825.4) / Mac OS from 127.0.0.1
    ✓ Testing started on Chrome (34.0.1825.4) / Mac OS
    ✓ Agent completed: Chrome (34.0.1825.4) / Mac OS
    Coverage summary:
    Statements   : 96.02% ( 1110/1156 )
    Branches     : 88.53% ( 772/872 )
    Functions    : 97.45% ( 229/235 )
    Lines        : 96.27% ( 1110/1153 )
    ✓ 397 tests passed! (7 seconds)

Use the `--coverage-report` option to generate reports written to `./coverage`
or another directory defined by `--coverage-dir`. Values for `--coverage-report` include:

 - `lcov` for LCOV and HTML reports.
 - `lcovonly` for LCOV without HTML.
 - `html` for HTML only.
 - `json` for Istanbul JSON.
 - `summary` for the default summary shown above.
 - Any other [report supported by Istanbul][istanbul-report].

Yeti instruments all JavaScript files automatically with [Istanbul][]. If you'd prefer to instrument
your JavaScript code with Istanbul as a part of a build step, you can pass `--no-instrument`
to skip all instrumenting. Yeti will still generate code coverage reports if used with
the `--coverage` option.

If you'd like to exclude some JavaScript files from instrumenting, you can pass multiple
`--instrument-exclude` options defining [minimatch][] patterns to exclude.

    $ yeti -c --instrument-exclude "**/vendor/**" --instrument-exclude "**.nocover.js"

To prevent needing to specify these verbose options every time, you can put a
`coverageOptions` object in your project's `.yeti.json` file containing configuration
that is only used with `--coverage`.

    $ cd yui3/src/app
    $ cat ../../.yeti.json
    {
        "basedir": ".",
        "glob": "**/tests/unit/*.html",
        "coverageOptions": {
            "instrument": false,
            "query": "filter=coverage"
        }
    }
    $ yeti -c # will run with --no-instrument --query "filter=coverage"
    Found 1 file to test.
      Agent connected: Chrome (34.0.1825.4) / Mac OS from 127.0.0.1
    ✓ Testing started on Chrome (34.0.1825.4) / Mac OS
    ✓ Agent completed: Chrome (34.0.1825.4) / Mac OS
    Coverage summary:
    Statements   : 96.02% ( 1110/1156 )
    Branches     : 88.53% ( 772/872 )
    Functions    : 97.45% ( 229/235 )
    Lines        : 96.27% ( 1110/1153 )
    ✓ 397 tests passed! (7 seconds)

#### AJAX testing

Yeti provides server-side AJAX routes with [echoecho][ee]. Your test can
[make relative HTTP requests][ee-usage] to test your code against server-side HTTP
GET, POST, PUT, DELETE, OPTIONS, GET with delay, JSON or JSONP responses via POST,
or any HTTP status code.

Example supported routes:

 - `echo/status/500` returns a 500 response.
 - `echo/delay/3` returns a 200 response after 3 seconds.
 - `echo/jsonp?callback=foo` returns a JSONP response with the given
    POST data wrapped in a call to `foo`.

Note these routes are intentionally relative paths.
See the [echoecho README][ee-readme] for more details.

#### Timeouts

Yeti will move on to the next test if a test takes longer than 5 minutes (300 seconds).
You can adjust this interval with the `--timeout` option.

This will run Yeti with a 120 second timeout:

    $ yeti --timeout 120 test.html

There isn't a general timeout setting. Yeti actively pings browsers about every
2-5 seconds and disconnects them if they fail to respond to a ping three times.

#### Query string parameters

You can specify query string parameters to add to your test URLs.
This can be used to pass information to your tests that control its behavior.

This will append `?filter=coverage` to your tests, which is used by the tests
for the [YUI Library][YUI] to trigger loading instrumented code.

    $ yeti --query 'filter=coverage' test/*.html

#### Error handling

Yeti will report an uncaught exceptions as Script Errors.

Yeti enforces [No-Quirks Mode][] in your tests because it may impact DOM-related APIs. [Add a DOCTYPE][doctype] to your test document to fix this.

#### Mobile testing made easy

When combined with [localtunnel][], mobile testing is simple. If you're not dealing with sensitive information, startup your Yeti Hub and then run:

    $ localtunnel 9000
       Port 9000 is now publicly accessible from http://3z48.localtunnel.com ...

You can then visit that URL on your mobile (or any other) device and have it run new tests.

### Yeti Hub

To save time, start a Yeti Hub.

    $ yeti --server
    Yeti Hub listening on port 9000.

Point browsers at your local Yeti on port 9000. Now, you're ready to run tests without having to reconnect browsers each time.

Starting Yeti in another terminal will connect to that Hub instead of starting a new one
and will begin testing immediately if browsers are already connected.

    $ yeti test/*.html
    Connected to http://localhost:9000
      Agent connected: Chrome (22.0.1221.0) / Mac OS
      Agent connected: Safari (6.0) / Mac OS
    ✔ Testing started on Chrome (22.0.1221.0) / Mac OS, Safari (6.0) / Mac OS
    ✔ Agent completed: Chrome (22.0.1221.0) / Mac OS
    ✔ Agent completed: Safari (6.0) / Mac OS
    504 tests passed! (11.5 seconds)
    $

#### Sharing

Your Yeti Hub can be shared with other developers.

First, I'll start a Hub on test.yeti.cx on port 80.

    $ yeti --server --port 80

Go ahead and point a few browsers there.

Now, others can connect to it from their computer like so:

    $ yeti --hub http://test.yeti.cx/ test/*.html
    Connected to http://test.yeti.cx/
    Waiting for agents to connect at http://test.yeti.cx/.
    When ready, press Enter to begin testing.

Your `pwd` and your test file will be served through the Hub. Like magic.

    [Hit Enter]
      Agent connected: Chrome (22.0.1221.0) / Mac OS
      Agent connected: Safari (6.0) / Mac OS
    ✔ Testing started on Chrome (22.0.1221.0) / Mac OS, Safari (6.0) / Mac OS
    ✔ Agent completed: Safari (6.0) / Mac OS
    ✔ Agent completed: Chrome (22.0.1221.0) / Mac OS
    504 tests passed! (8.7 seconds)

This makes it really simple to setup an ad-hoc testing lab shared with your team.

#### Browser launching

You can specify the `wd-url` option to connect Yeti to a Selenium 2 Hub using the
WebDriver protocol. Specifying one or more `caps` options will cause Yeti to launch
browsers for the given capabilities over WebDriver.

For example, launching 2 Firefox browsers to test multiple files:

    yeti --hub http://example.com --wd-url http://localhost:4444 \
         --caps "browserName=firefox;version=26;platform=Windows XP" \
         --caps "browserName=firefox;version=26;platform=Windows XP" test/*.html

Or launching an iPhone simulator on Sauce Labs:

    yeti --caps "platform=OS X 10.8;version=7;device-orientation=portrait;app=safari;device=iPhone Simulator" test.html

### Options

Here's a breakdown of all available CLI options.

 - *query* (String) Query string parameters to pass to tests.
 - *timeout* (Number in seconds) Test timeout.
 - *hub* (URL) Location of the Yeti Hub to use.
   Set to `false` or specify `--no-hub` to override a configuration file.
 - *server* Starts a Yeti Hub.
 - *port* (Number) Yeti Hub will listen to this port.
 - *loglevel* (`debug` or `info`) Print debugging information.
 - *caps* (String) Browser capabilities to launch with WebDriver.
   Should be used with `wd-url`.
 - *wd-url* (URL) WebDriver Hub URL. May contain a username and password.
 - *help* Print usage.
 - *version* Print the Yeti version.

#### Configuration file

You may use place JSON in a `.yeti.json` file to set project or user specific configuration.

Yeti will look for `.yeti.json` in these places:

 - Recursively starting in the directory you start Yeti
 - In your home folder

Here is an example `.yeti.json` for the YUI project, which is placed in the repository root:

    {
        "hub": "http://test.yeti.cx/",
        "basedir": ".",
        "glob": "**/tests/unit/*.html"
    }

Here is the breakdown of these settings:

 - The *hub* option defines a Yeti Hub URL to use.
 - The *basedir* option indicates that the directory where `.yeti.json` lives is
    permitted to serve files to the Yeti Hub.
 - The *glob* option defines a pattern to search for test files.

These settings let YUI developers simply run `yeti` inside of the project directory
to run tests. Since all tests in the project match the glob pattern, the `yeti`
command works for specific components as well as for the entire project.

This configuration can be overridden on the command line. For example, to ignore the
hub setting, you can run Yeti with `--no-hub`.

## Yeti API

You can `require("yeti")` inside your application to script Yeti for your own use.

For API documentation:

 - Run `make html` to build HTML documentation to `./build_docs`.
 - Review code comments inside `lib/yeti.js`, `lib/client.js` and `lib/hub/index.js`.

Yeti follows [Semantic Versioning](http://semver.org/) but is currently at a 0.x.y release. **The public API is not stable.** There will be changes.

### Client-Side Yeti Integration

Yeti typically automates test frameworks, but you can integrate any client-side test or performance framework
into Yeti. Combined with the Yeti API, you can easily build your own automation tools. YUI uses Yeti in this
way to automate performance benchmarks.

Normally Yeti will scan pages in order to find test frameworks. When serving a page to Yeti, you can set
`window.stopYetiScan` to true to signal that your page will explicitly submit results to Yeti.

When your framework has results and is ready to move to the next page, you can call `window.sendYetiResults`
with an object containing data to report. This data will be passed through verbatim to the Node.js Yeti API
for further processing in your tool.

## Caveats

### Platforms

Yeti should work on all platforms supported by Node.js.
It's tested on Linux and OS X.

### Serving tests

You must start Yeti's client in the directory you'll be serving tests from. For security reasons, Yeti will reject requests that try to access files outside of the directory you start Yeti in.

## Install latest Yeti snapshot

You can install the latest development snapshot of Yeti easily:

    npm install -g http://latest.yeti.cx

This will install Yeti as it exists on the [yui/yeti GitHub repository][github].
You can check the stability of the Yeti snapshot by checking [yui/yeti on Travis][travis].

## Develop Yeti

Do you want to add new features or fix bugs in Yeti itself? We made it easy for you to hack on Yeti.

### Experimental: Develop on Windows

After running `npm install`, replace the `make` commands below with
`.\jake.bat` to use the experimental Jake tasks that are Windows ready.

### Code

#### Install dependencies

Clone Yeti.

    git clone https://github.com/yui/yeti.git
    cd yeti

Install Yeti's dependencies.

    npm install

#### Run tests & code coverage

Yeti's automated tests require PhantomJS.
You can [download PhantomJS](http://phantomjs.org/download.html) source or pre-built
binaries from their website. Make sure the `phantomjs` binary is installed in your PATH.

    make test
    make coverage

The latter command uses [JSCoverage for Node.js][jsc],
which will be built and installed to `./tools/jscoverage`.

#### Linter

    make lint

You may also run the linter on individual files with `./go lint`:

    ./go lint test/blizzard.js

Yeti uses [JSHint][] to analyze code for problems. See `.jshintrc` for options used by Yeti.

#### Profiler

Requires [Google Chrome Canary][canary] and OS X.

Profile the Yeti Hub:

    ./go profile --server

Using `./go profile` without `--server` to profile the Yeti client
requires an interactive terminal, which does not yet work.

### HTML documentation

#### Website

Yeti uses [Selleck][] to generate its website. Selleck files are located in `doc/`.

    make html

Documentation will be built to `build_docs/`.

#### JavaScript API

Yeti uses [YUIDocJS][] to generate API documentation from inline JSDoc comment blocks.

    make html-api

Documentation will be built to `build_docs/api/everything/`.

### Contribute to Yeti

See [CONTRIBUTING.md](https://github.com/yui/yeti/blob/master/CONTRIBUTING.md).

## Bugs & Feedback

Open a ticket on [YUILibrary.com's Yeti Issue Tracker][issues] to report bugs or feature requests.

## License

Yeti is free to use under YUI's BSD license.
See the LICENSE file or the [YUI license page](http://yuilibrary.com/license/)
for license text and copyright information.

  [Jenkins]: http://jenkins-ci.org/
  [ee]: https://github.com/davglass/echoecho
  [ee-usage]: https://github.com/davglass/echoecho#using-in-your-tests
  [ee-readme]: https://github.com/davglass/echoecho#readme
  [canary]: https://tools.google.com/dlpage/chromesxs
  [github]: https://github.com/yui/yeti
  [travis]: http://travis-ci.org/yui/yeti
  [JSHint]: http://jshint.com/
  [YUIDocJS]: https://github.com/davglass/yuidocjs
  [Selleck]: http://github.com/rgrove/selleck
  [jsc]: https://github.com/visionmedia/node-jscoverage
  [localtunnel]: http://localtunnel.com/
  [node]: http://nodejs.org/
  [npm]: http://npmjs.org/
  [issues]: http://yuilibrary.com/projects/yeti/newticket
  [YUI]: http://yuilibrary.com/
  [yuitest]: http://yuilibrary.com/yuitest/
  [QUnit]: http://qunitjs.com/
  [Mocha]: http://visionmedia.github.com/mocha/
  [Expect.js]: https://github.com/LearnBoost/expect.js
  [Jasmine]: https://jasmine.github.io/
  [DOH]: http://dojotoolkit.org/reference-guide/util/doh.html
  [doctype]: http://www.whatwg.org/specs/web-apps/current-work/multipage/syntax.html#the-doctype
  [No-Quirks Mode]: http://www.whatwg.org/specs/web-apps/current-work/multipage/dom.html#no-quirks-mode
  [minimatch]: https://github.com/isaacs/minimatch
  [Istanbul]: https://github.com/gotwarlost/istanbul
  [istanbul-report]: https://github.com/gotwarlost/istanbul/tree/master/lib/report
