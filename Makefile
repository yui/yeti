all: install
.PHONY: all

install:
	npm install .
	./jake dep
.PHONY: install

test:
	# Problem? Type `make install` first.
	npm test
.PHONY: test

spec:
	# Problem? Type `make install` first.
	./jake test
.PHONY: spec

coverage:
	# Problem? Type `make install` first.
	./jake coverage
.PHONY: coverage

html:
	# Problem? Type `make install` first.
	./jake html
.PHONY: html

html-api:
	# Problem? Type `make install` first.
	./jake html-api
.PHONY: html-api

lint:
	# Problem? Type `make install` first.
	./jake lint
.PHONY: lint

site: clean html-api html coverage
.PHONY: site

release-dep:
	# Problem? Type `make install` first.
	./jake release-dep
.PHONY: release-dep

clean:
	# Problem? Type `make install` first.
	./jake clean
.PHONY: clean

maintainer-clean:
	# Problem? Type `make install` first.
	./jake maintainer-clean
.PHONY: maintainer-clean
