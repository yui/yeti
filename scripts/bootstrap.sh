#!/bin/sh

# Requires Mac OS X.

[ ! -e /usr/local/.git ] && echo "Installing homebrew." \
    && ruby -e "$(curl -fsS http://gist.github.com/raw/323731/install_homebrew.rb)"

echo "Installing node, npm, etc."
brew install node

# Homebrew's npm install is horribly broken, again
[ -f "$(which npm 2>/dev/null)" ] || curl http://npmjs.org/install.sh | sh

echo "Linking npm and yeti."
ln -s `brew --prefix node`/bin/npm /usr/local/bin/npm
ln -s `brew --prefix node`/bin/yeti /usr/local/bin/yeti

hash -r
