all: install

test:
	npm test

install-stable:
	npm install yeti

install:
	npm install .

remove:
	npm uninstall yeti

.PHONY: all install-stable install remove test
