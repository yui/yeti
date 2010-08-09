#!/bin/sh

# Requires Mac OS X.

[ ! -e /usr/local/.git ] && echo "Installing homebrew." \
    && ruby -e "$(curl -fsS http://gist.github.com/raw/323731/install_homebrew.rb)"

echo "Installing node and npm."
brew install node && brew install npm

hash -r
