all: install-stable

export NPM=$(shell brew --prefix node)/bin/npm

bootstrap:
	./scripts/bootstrap.sh

install-stable: bootstrap
	${NPM} install yeti@stable
	@echo To setup your PATH and fix yeti not found errors, run:
	@echo   source ./scripts/postinstall.sh

install: bootstrap
	${NPM} install .
	@echo To setup your PATH and fix yeti not found errors, run:
	@echo   source ./scripts/postinstall.sh

link: install
	${NPM} link .

.PHONY: all bootstrap install-stable install link
