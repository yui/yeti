yeti
====

Yeti is the YUI Easy Testing Interface.

How easy?
--------

Here you go:

    [reid@benson ~/working/yui/yui3]
    $ yeti src/dom/tests/dom.html src/attribute/tests/attribute.html src/json/tests/json.html
    ✔  yuisuite on Safari (5.0.2) / Mac OS
       21 passed,  0 failed

    ✔  Attribute Unit Tests on Safari (5.0.2) / Mac OS
       106 passed,  0 failed

    ✔  Y.JSON (JavaScript implementation) on Safari (5.0.2) / Mac OS
       68 passed,  0 failed

    195 tests passed! (3224ms)

What just happened?
-------------------

Yeti is a command-line tool for launching JavaScript unit tests in a browser and reporting the results without leaving your terminal. Yeti is designed to work with existing unmodified YUI-based tests.

Yeti is designed to help you run tests before you commit. It compliments existing CI tools like Selenium and Hudson which run tests post-commit. Yeti is not a replacement for those tools.

Server mode!
------------

You can also run Yeti as a server:

    $ yeti
    Yeti will only serve files inside /Users/reid
    Visit http://localhost:8000, then run:
        yeti <test document>
    to run and report the results.

Then subsequent Yeti commands will dispatch tests to all browsers pointed at the test page at that moment:

    $ yeti src/datatype/tests/xml.html
    Waiting for results. When you're done, hit Ctrl-C to exit.
    ✔  DataType.XML Test Suite on Chrome (6.0.472.63) / Mac OS
       6 passed,  0 failed

    ✖  DataType.XML Test Suite on Internet Explorer (9.0) / Windows
       5 passed,  1 failed
       in XML Format Tests
         testFormat: Expected original string within new string.
           Expected: true (boolean)
           Actual: false (boolean)

    ✔  DataType.XML Test Suite on Safari (5.0.2) / Mac OS
       6 passed,  0 failed

    ^C

As you can see, this is very handy to quickly run tests on mobile devices. You can pass multiple tests to Yeti, as always.

Server mode is great for working offline: you can test your commits across browsers in different local VMs without requiring a network connection to a centralized test system.

### Advanced options

You can pass the `--port` option to override port 8000 with your preferred server port. If you do this, be sure to also pass `--port` when running Yeti as a client.

Yeti doesn't exit automatically when used with server mode. If you're using only 1 browser with server mode (i.e. just running tests on 1 browser on another computer or VM), you may use the `--solo 1` option to have Yeti exit with a summary after all tests run once. This is also handy for scripting Yeti: if a failure occurs, Yeti will exit with a non-zero status code.

Please note that Yeti keeps running until you exit with Ctrl-C, even after all tests results have arrived. (This will be fixed in a future release.)

Special tests
-------------

Yeti will report an uncaught exception like so:

    ✖  http://10.1.1.10:8000/project/8364931/Users/reid/Development/yui/yui3/src/jsonp/tests/jsonp.html on Internet Explorer (9.0) / Windows
       0 passed,  1 failed
       in window.onerror handler (yeti virtual test)
         window.onerror should not fire: Syntax error

Yeti enforces [No-Quirks Mode][] in your tests because it may impact DOM-related APIs. Yeti will abort testing in this case:

    ✖  http://10.1.1.10:8000/project/8364931/Users/reid/Development/yui/yui3/src/test/tests/mock.html on Internet Explorer (9.0) / Windows
       0 passed,  1 failed
       in window.onerror handler (yeti virtual test)
         window.onerror should not fire: Not in Standards Mode!

[Add a DOCTYPE][doctype] to your test document to fix this.

Mobile testing made easy
------------------------

When combined with [localtunnel][], running tests is simple. If you're not dealing with sensitive information, startup your Yeti server and then run:

    $ localtunnel 8000
       Port 8000 is now publicly accessible from http://3z48.localtunnel.com ...

You can then visit that URL on your mobile (or any other) device and have it run new tests.

Caveats
-------

Yeti is currently only tested on Mac OS X. However, you can run tests on any platform: just run Yeti in server mode and point the browser on another OS to your Yeti server. Yeti should work on other platforms as well, especially in server mode. Feel free to submit patches: see the Contribute section below.

You must start Yeti in server mode in the directory you'll be serving tests from. For security reasons, Yeti will reject requests that try to access files outside of the directory you start Yeti in.

Installation
------------

This is experimental software. Use at your own risk. For now, we've only tested the installation process on Mac OS X.

### Recommended Install

If you have [npm][] installed, this will be easy.

    $ npm install yeti@stable

If you want to run off the latest code, clone this project and then run make.

    $ git clone git://github.com/reid/yeti.git && cd yeti && make

This will install [homebrew][], [node][] and [npm][] for you if you don't have them installed already.

Installing [localtunnel][] helps proxy Yeti outside of your firewall. It's available as a Ruby gem:

    $ gem install localtunnel

### Native Mac Install

A fancy native installer is available if you're using a modern Mac. You will need:

* Mac OS X 10.6 or later
* An Intel Core 2 processor or better

Check out [GitHub Downloads on reid/yeti][dl] for the installer.

The native installer is limited to modern configurations because it ships with all dependencies pre-built. If you have a different configuration, please install with the recommended install method.

Bugs & Feedback
---------------

Open a ticket on [YUILibrary.com's Yeti Issue Tracker][issues] to report bugs or feature requests.

Yeti is an experimental project of [YUI Labs][]. As such, it doesn't receive the same level of support as other mature YUI projects.

Testing
-------

Yeti uses [Vows][] for testing its built-in server. After installing Vows, you may run the `vows` command to run all suites. See the [Vows website][Vows] for information on installing and running Vows.

The server test suite requires [YUI 3][yui3] and [YUI 2][yui2] to be installed into tests/vendor to test its integration with YUI Test. Symlink yui2 and yui3 repo directories from elsewhere or place the library downloads here.

License
-------

Yeti is free to use under YUI's BSD license. See the LICENSE file or the [YUI license page][license] for license text and copyright information.

Contribute
----------

Your contributions are welcome! Please review the [YUI contributor guide][CLA] before contributing. If you haven't contributed to a [YUI project][YUI] before, you'll need to review and sign the [YUI CLA][CLA] before we can accept your pull request.

  [jspec]: http://github.com/visionmedia/jspec
  [yui3]: http://github.com/yui/yui3
  [yui2]: http://github.com/yui/yui2
  [localtunnel]: http://localtunnel.com/
  [homebrew]: http://github.com/mxcl/homebrew
  [node]: http://nodejs.org/
  [npm]: http://npmjs.org/
  [dl]: http://github.com/reid/yeti/downloads
  [issues]: http://yuilibrary.com/projects/yeti/newticket
  [YUI Labs]: http://yuilibrary.com/labs/
  [Vows]: http://vowsjs.org/
  [license]: http://developer.yahoo.com/yui/license.html
  [CLA]: http://developer.yahoo.com/yui/community/#cla
  [YUI]: http://yuilibrary.com/
  [doctype]: http://www.whatwg.org/specs/web-apps/current-work/multipage/syntax.html#the-doctype
  [No-Quirks Mode]: http://www.whatwg.org/specs/web-apps/current-work/multipage/dom.html#no-quirks-mode
