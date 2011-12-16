all: install
.PHONY: all

test:
	npm test
.PHONY: test

install:
	npm install .
.PHONY: install

lint:
	find bin lib test -name "*.js" -print0 | xargs -0 ./lint
.PHONY: lint
