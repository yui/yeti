#!/bin/sh

# Requires Mac OS X.

echo "Checking for homebrew..."
[ ! -e /usr/local/.git ] && ruby -e "$(curl -fsS http://gist.github.com/raw/323731/install_homebrew.rb)"

echo "Installing node and npm."
brew install node && brew install npm

echo "You will need to add this directory to your PATH:"
brew --prefix node
