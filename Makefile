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
	cat README.md | sed '1,4d' | \
		./node_modules/.bin/ronn -5 | \
		sed -e 's/<[\/]*html>//g' -e 's/<pre>/<pre class="code">/g' \
		> doc/quick-start/index.mustache
	./node_modules/.bin/selleck
.PHONY: html

html-api:
	# Problem? Type `make install` first.
	mkdir -p build_docs/api/everything
	./node_modules/.bin/yuidoc --project-version `node cli.js -v`
.PHONY: html-api

lint:
	# Problem? Type `make install` first.
	find lib test -name "*.js" \! -name "*min.js" -print0 | xargs -0 ./go lint
.PHONY: lint

clean:
	rm -rf build_docs
.PHONY: clean

publish: clean html-api html coverage
	rsync -avz build_docs/ rburke@yeti.cx:public/doc/dev/

maintainer-clean:
	npm rm webkit-devtools-agent
	rm -rf tools
.PHONY: maintainer-clean
