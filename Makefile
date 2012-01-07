all: install
.PHONY: all

test:
	npm test
.PHONY: test

spec:
	./node_modules/.bin/vows --spec test/*.js
.PHONY: spec

install:
	npm install .
.PHONY: install

lint:
	find bin lib test -name "*.js" -print0 | xargs -0 ./lint
.PHONY: lint
