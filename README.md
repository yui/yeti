# Yeti [Next][]

[![Build Status](https://secure.travis-ci.org/yui/yeti.png?branch=master)](http://travis-ci.org/yui/yeti)

Yeti is a command-line tool for launching JavaScript unit tests in a browser and reporting the results without leaving your terminal. Yeti is designed to work with tests built on YUI Test just as they are.

[Next]: https://github.com/yui/yeti/wiki/Yeti-Next

## Getting Started

Just run Yeti with the HTML file containing your test.

    $ yeti test/fixture/basic.html
    Creating a Hub at http://localhost:9000
    Waiting for agents to connect at http://localhost:9000.
    When ready, press Enter to begin testing.

Point your browsers at that URL, then come back and press Enter.

      Agent connected: Safari (5.1.2) / Mac OS [Hit Enter]

    ✔ Testing started!
    ✔ Yeti Simple Test Suite on Safari (5.1.2) / Mac OS
    ✔ Agent completed: Safari (5.1.2) / Mac OS
    1 test passed! (175ms)
    $

Yeti exits automatically when all tests complete. If test failures occur, Yeti will exit with a non-zero status code.

## Yeti Hub

To save time, start a Yeti Hub.

    $ yeti --server
    Yeti Hub listening on port 9000.

Point browsers at your local Yeti on port 9000. Now, you're ready to run tests without having to reconnect browsers each time.

In another Terminal, running Yeti will connect to this Hub instead of starting a new one.

    $ yeti test/fixture/basic.html
    Connected to http://localhost:9000
    Waiting for agents to connect at http://localhost:9000.
    When ready, press Enter to begin testing. [Hit Enter]
    ✔ Testing started!
    ✔ Yeti Simple Test Suite on Safari (5.1.2) / Mac OS
    ✔ Agent completed: Safari (5.1.2) / Mac OS
    1 test passed! (107ms)

## Sharing Your Yeti Hub

Your Yeti Hub can be shared with other developers.

First, I'll start a Hub on test.yeti.cx on port 80.

    $ yeti --server --port 80

Go ahead and point a few browsers there.

Now, others can connect to it from their computer like so:

    $ yeti --hub http://test.yeti.cx/ test/fixture/basic.html
    Connected to http://test.yeti.cx/
    Waiting for agents to connect at http://test.yeti.cx/.
    When ready, press Enter to begin testing.

Your `pwd` and your test file will be served through the Hub. Like magic.

    [Hit Enter]
    ✔ Testing started!
    ✔ Yeti Simple Test Suite on Safari (5.1.2) / Mac OS
    ✔ Agent completed: Safari (5.1.2) / Mac OS
    1 test passed! (189ms)

This makes it really simple to setup an ad-hoc testing lab shared with your team.

Caveat: Yeti Next has not been tested with a large number of browsers and Hub clients. If you'd like to help change this, see the Contribute section below.

## Error handling

Note: Yeti Next will fail when given test files that do not exist. This will be fixed in a future release.

Yeti will report an uncaught exceptions as Script Errors.

Yeti enforces [No-Quirks Mode][] in your tests because it may impact DOM-related APIs. [Add a DOCTYPE][doctype] to your test document to fix this.

## Mobile testing made easy

When combined with [localtunnel][], mobile testing is simple. If you're not dealing with sensitive information, startup your Yeti Hub and then run:

    $ localtunnel 9000
       Port 9000 is now publicly accessible from http://3z48.localtunnel.com ...

You can then visit that URL on your mobile (or any other) device and have it run new tests.

## Caveats

Yeti is known to work on:

 - Mac OS X
 - Linux

You must start Yeti's client in the directory you'll be serving tests from. For security reasons, Yeti will reject requests that try to access files outside of the directory you start Yeti in.

## Installation

This is experimental software. Use at your own risk.

You will need Node.js v0.6.x or later. Node.js v0.6.11 is recommended.

If you want to run Yeti Next, clone this project if you haven't yet done so.

    $ git clone git://github.com/reid/yeti.git
    $ cd yeti
    $ git checkout next

Now install it.

    $ npm install -g

Installing [localtunnel][] helps proxy Yeti outside of your firewall. It's available as a Ruby gem:

    $ gem install localtunnel

## Yeti API

You can `require("yeti")` inside your application to script Yeti for your own use.

For API documentation:

 - Run `make html` to build HTML documentation to `./api`.
 - Review code comments inside `lib/yeti.js`, `lib/client.js` and `lib/hub/index.js`.

Yeti follows [Semantic Versioning](http://semver.org/) but is currently at a 0.x.y release. **The public API is not stable.** There will be changes.

## Testing

First, install the latest [PhantomJS][] for your platform. With [Homebrew][], just run `brew update; brew install phantomjs`.

Run `npm install` to locally install Vows and other dev dependencies.

Run `make test` to run Vows tests, `make spec` for more details.

Run `make coverage` to generate code coverage using [JSCoverage for Node.js][jsc], which will be built and installed to `./tools/jscoverage`.

Note: As of February 29, 2012, you must have an internet connection for Yeti to work and pass tests, since it currently pulls in YUI from yahooapis.com.

## Bugs & Feedback

Open a ticket on [YUILibrary.com's Yeti Issue Tracker][issues] to report bugs or feature requests.

Yeti is an experimental project of YUI Labs. As such, it doesn't receive the same level of support as other mature YUI projects.

## License

Yeti is free to use under YUI's BSD license. See the LICENSE file or the [YUI license page][license] for license text and copyright information.

## Contribute

Your contributions are welcome! Please review the [YUI contributor guide][CLA] before contributing. If you haven't contributed to a [YUI project][YUI] before, you'll need to review and sign the [YUI CLA][CLA] before we can accept your pull request.

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
