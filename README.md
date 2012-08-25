# Yeti

[![Build Status](https://secure.travis-ci.org/yui/yeti.png?branch=master)](http://travis-ci.org/yui/yeti)

Yeti is a command-line tool for launching JavaScript unit tests in a browser and reporting the results without leaving your terminal. Yeti is designed to work with tests built on YUI Test just as they are.

## Using Yeti

### Running a test

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
    Testing... / 86% complete (19/22) 121.99 tests/sec ✔ Agent completed: Safari (6.0) / Mac OS
    Testing... | 95% complete (21/22) 115.40 tests/sec ✔ Agent completed: Chrome (22.0.1221.0) / Mac OS
    Testing... \ 100% complete (22/22) 115.23 tests/sec 504 tests passed! (9164ms)
    $

Yeti exits automatically when all tests complete. If test failures occur, Yeti will exit with a non-zero status code.

### Code coverage

Yeti automatically includes a line coverage summary if your tests were instrumented with [YUI Test Coverage][yuitest].

    ✔ Testing started on Safari (6.0) / Mac OS
    Testing... \ 13% complete (10/60) 11.85 tests/sec 44% line coverage

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
    Testing... / 68% complete (15/22) 98.84 tests/sec ✔ Agent completed: Chrome (22.0.1221.0) / Mac OS
    Testing... | 95% complete (21/22) 91.65 tests/sec ✔ Agent completed: Safari (6.0) / Mac OS
    Testing... \ 100% complete (22/22) 91.60 tests/sec 504 tests passed! (11529ms)
    $

### Sharing Your Yeti Hub

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
    Testing... - 91% complete (20/22) 122.51 tests/sec ✔ Agent completed: Safari (6.0) / Mac OS
    Testing... | 95% complete (21/22) 120.21 tests/sec ✔ Agent completed: Chrome (22.0.1221.0) / Mac OS
    Testing... \ 100% complete (22/22) 120.05 tests/sec 504 tests passed! (8763ms)

This makes it really simple to setup an ad-hoc testing lab shared with your team.

### Timeouts

Yeti will disconnect a browser if it does not record any activity from it for 45 seconds.
You can adjust this interval with the `--timeout` option.

This will run Yeti with a 120 second timeout:

    $ yeti --timeout 120 test.html

### Query string parameters

Yeti can include a query string parameter to add to your test URLs.
This can be used to pass information to your tests that control its behavior.

This will append `?fliter=coverage` to your tests, which is used by the tests
for the [YUI Library][YUI] to trigger loading instrumented code.

    $ yeti --query 'filter=coverage' test/*.html

### Error handling

Yeti will report an uncaught exceptions as Script Errors.

Yeti enforces [No-Quirks Mode][] in your tests because it may impact DOM-related APIs. [Add a DOCTYPE][doctype] to your test document to fix this.

### Mobile testing made easy

When combined with [localtunnel][], mobile testing is simple. If you're not dealing with sensitive information, startup your Yeti Hub and then run:

    $ localtunnel 9000
       Port 9000 is now publicly accessible from http://3z48.localtunnel.com ...

You can then visit that URL on your mobile (or any other) device and have it run new tests.

### Yeti API

You can `require("yeti")` inside your application to script Yeti for your own use.

For API documentation:

 - Run `make html` to build HTML documentation to `./build_docs`.
 - Review code comments inside `lib/yeti.js`, `lib/client.js` and `lib/hub/index.js`.

Yeti follows [Semantic Versioning](http://semver.org/) but is currently at a 0.x.y release. **The public API is not stable.** There will be changes.

### Caveats

Yeti should work on all platforms supported by Node.js.
It's tested on Linux and OS X.

You must start Yeti's client in the directory you'll be serving tests from. For security reasons, Yeti will reject requests that try to access files outside of the directory you start Yeti in.

## Installation

Yeti requires [Node.js][node] v0.6 or v0.8.

### Latest snapshot

    # Install Yeti from the latest source from GitHub's yui/yeti repo.
    npm install -g http://latest.yeti.cx

### Latest release

If you have problems with the latest Yeti, you may install the last stable release instead:

    npm install -g yeti

### Localtunnel

Installing [localtunnel][] helps proxy Yeti outside of your firewall. It's available as a Ruby gem:

    gem install localtunnel

## Develop Yeti

Do you want to add new features or fix bugs in Yeti itself? We made it easy for you to hack on Yeti.

### Experimental: Develop on Windows

After running `npm install`, replace the `make` commands below with
`.\jake.bat` to use the experimental Jake tasks that are Windows ready.

### Install dependencies

Clone Yeti.

    git clone https://github.com/yui/yeti.git
    cd yeti

Install Yeti's devDependencies.

    npm install

Yeti's automated tests use [PhantomJS][]. Install it.

    # For Mac OS X and Homebrew:
    brew update
    brew install phantomjs

### Run tests

Requires [PhantomJS][] to be installed.

    make test

### Code coverage

Requires [PhantomJS][] to be installed.

    make coverage

This command uses [JSCoverage for Node.js][jsc],
which will be built and installed to `./tools/jscoverage`.

### HTML documentation

#### Website

Documentation will be built to `build_docs/`.

    make html

Yeti uses [Selleck][] to generate its website. Selleck files are located in `doc/`.

#### JavaScript API

Documentation will be built to `build_docs/api/everything/`.

    make html-api

Yeti uses [YUIDocJS][] to generate API documentation from inline JSDoc comment blocks.

### Linter

    make lint

You may also run the linter on individual files with `./go lint`:

    ./go lint test/blizzard.js

Yeti uses [JSHint][] to analyze code for problems. See `.jshintrc` for options used by Yeti.

### Profiler

Requires [Google Chrome Canary][canary] and Mac OS X.

Profile the Yeti Hub:

    ./go profile --server

Using `./go profile` without `--server` to profile the Yeti client
requires an interactive terminal, which does not yet work.

### Contribute to Yeti

Your contributions are welcome!
Please review the [YUI contributor guide][CLA]
before contributing.

If you haven't contributed to
a YUI project before,
you'll need to review and sign
the [YUI CLA][CLA]
before we can accept your pull request.

#### Contribution Checklist

 1. Run `make lint` and make sure your new code runs through the linter without error.
 1. Run `make coverage` and make sure your new code is covered with a test.
    Tests are located in `test` and use [Vows][].

## Bugs & Feedback

Open a ticket on [YUILibrary.com's Yeti Issue Tracker][issues] to report bugs or feature requests.

Yeti is an experimental project of YUI Labs. As such, it doesn't receive the same level of support as other mature YUI projects.

## License

Yeti is free to use under YUI's BSD license. See the LICENSE file or the [YUI license page][license] for license text and copyright information.

  [canary]: https://tools.google.com/dlpage/chromesxs
  [JSHint]: http://jshint.com/
  [YUIDocJS]: https://github.com/davglass/yuidocjs
  [Selleck]: http://github.com/rgrove/selleck
  [PhantomJS]: http://phantomjs.org/
  [jsc]: https://github.com/visionmedia/node-jscoverage
  [jspec]: http://github.com/visionmedia/jspec
  [localtunnel]: http://localtunnel.com/
  [Homebrew]: http://github.com/mxcl/homebrew
  [node]: http://nodejs.org/
  [npm]: http://npmjs.org/
  [win]: https://github.com/reid/yeti/wiki/Yeti-on-Windows
  [issues]: http://yuilibrary.com/projects/yeti/newticket
  [Vows]: http://vowsjs.org/
  [license]: http://yuilibrary.com/license/
  [CLA]: http://yuilibrary.com/contribute/cla/
  [YUI]: http://yuilibrary.com/
  [doctype]: http://www.whatwg.org/specs/web-apps/current-work/multipage/syntax.html#the-doctype
  [No-Quirks Mode]: http://www.whatwg.org/specs/web-apps/current-work/multipage/dom.html#no-quirks-mode
