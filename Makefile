all: install
.PHONY: all

install:
	npm install .
.PHONY: install

test:
	# Problem? Type `make install` first.
	npm test
.PHONY: test

spec:
	# Problem? Type `make install` first.
	./node_modules/.bin/vows --spec test/*.js
.PHONY: spec

coverage:
	# Problem? Type `make install` first.
	sh scripts/coverage.sh
.PHONY: coverage

html:
	# Problem? Type `make install` first.
	./node_modules/.bin/selleck
.PHONY: html

html-api:
	# Problem? Type `make install` first.
	./node_modules/.bin/yuidoc
.PHONY: html-api

lint:
	# Problem? Type `make install` first.
	find bin lib test -name "*.js" -print0 | xargs -0 ./lint
.PHONY: lint
