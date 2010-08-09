all: install-stable

bootstrap:
	./scripts/bootstrap.sh
	ln -sf ../share/npm/bin/yeti /usr/local/bin/yeti

install-stable: bootstrap
	npm install yeti@stable

install: bootstrap
	npm install .

link: bootstrap
	npm link .

remove:
	npm uninstall yeti

.PHONY: all bootstrap install-stable install link remove
