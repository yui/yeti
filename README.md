yeti
====

Yeti is the YUI Easy Testing Interface.

How easy?
--------

Here you go:

    [reid@benson ~/working/yui/yui3/src]
    $ yeti attribute/tests/attribute.html json/tests/json.html history/tests/functional/history-base.html
    Waiting for results...
    ✔  history-base
      15 passed
      0 failed
    ✔  Y.JSON (JavaScript implementation)
      68 passed
      0 failed
    ✔  Attribute Unit Tests
      106 passed
      0 failed

    189 tests passed! (4155ms)

What just happened?
-------------------

Yeti is a command-line tool for launching JavaScript unit tests in a browser and reporting the results without leaving your terminal. It's very similar to [jspec][] in this regard,  except yeti is designed to work with existing unmodified YUI-based tests.

You probably shouldn't use this. Yet.
-------------------------------------

Yeti is very limited:

  - Requires and only works with Safari on Mac OS X.
  - Assumes you're testing the local copy of the [yui3][] project.

In the future, Yeti will probably meet your needs better. Right now, it's pretty handy for YUI developers. :)

Installation
------------

This is experimental software. Use at your own risk.

You should only do this on Mac OS X. Yeti won't work on other platforms (yet).

If you have [npm][] installed, this will be easy.

    $ npm install yeti

If you want to run off the latest code, clone this project and then run make.

    $ git clone git://github.com/reid/yeti.git && cd yeti && make

This will install [homebrew][], [node][] and [npm][] for you if you don't have them installed already.

  [jspec]: http://github.com/visionmedia/jspec
  [yui3]: http://github.com/yui/yui3
  [homebrew]: http://github.com/mxcl/homebrew
  [node]: http://nodejs.org/
  [npm]: http://npmjs.org/

