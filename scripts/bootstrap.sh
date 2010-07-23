#!/bin/sh

# Requires Mac OS X.

[ ! -e /usr/local/.git ] && echo "Installing homebrew." \
    && ruby -e "$(curl -fsS http://gist.github.com/raw/323731/install_homebrew.rb)"

echo "Installing node and npm."
# Homebrew and npm don't play nicely at the moment.
brew install node # && brew install npm

# nuke old npm
echo "Removing homebrew's npm."
# brew's cleanup and uninstall won't work unless
# the latest version is installed. fun!
brew install npm 2>&1 > /dev/null
# now, begone
brew cleanup npm 2>&1 >/dev/null
brew uninstall npm 2>&1 >/dev/null

# install npm
[ ! -e $NPM ] && echo "Installing npm." \
    && curl http://npmjs.org/install.sh | sh

# unhash npm, node locations
hash -r

# update location for makefile
export NPM=$(brew --prefix node)/bin/npm

echo "Removing existing yeti."
$NPM uninstall yeti
