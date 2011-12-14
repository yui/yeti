all: install

test:
	npm test

install-stable:
	npm install yeti

install:
	npm install .

link:
	npm link .

remove:
	npm uninstall yeti

.PHONY: all install-stable install link remove test
