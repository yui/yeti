all: install-stable

bootstrap:
	./scripts/bootstrap.sh

install-stable: bootstrap
	npm install yeti@stable
	./scripts/postinstall.sh

install: bootstrap
	npm install .
	./scripts/postinstall.sh

link: install
	npm link .

.PHONY: all bootstrap install-stable install link
