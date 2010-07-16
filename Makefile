all: bootstrap install-local

bootstrap:
	./scripts/bootstrap.sh

install-local:
	npm install .
	./scripts/postinstall.sh

link-local:
	npm link .

.PHONY: all bootstrap install-local link-local
