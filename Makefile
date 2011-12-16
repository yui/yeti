all: install

test:
	npm test

install-stable:
	npm install yeti

install:
	npm install .

remove:
	npm uninstall yeti

lint:
	find bin lib test -name "*.js" -print0 | xargs -0 node ./node_modules/.bin/jslint

.PHONY: all install-stable install remove test
