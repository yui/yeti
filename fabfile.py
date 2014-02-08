from fabric.api import *
from fabric.contrib.project import rsync_project
import json

metadata = json.loads(open("package.json", "r").read())

try:
    hosts = json.loads(open(".hosts.json", "r").read())
except IOError:
    print "Specify hosts to deploy to in .hosts.json first."
    exit()

env.use_ssh_config = True
env.hosts = hosts

doc_dir = "public/doc"
version = metadata["version"]

@runs_once
def make_site():
    local("./jake html")

@parallel
def deploy_site():
    target = doc_dir + "/dev/"
    rsync_project(remote_dir=target, local_dir="build_docs/")

@parallel
def release_site():
    deploy_site()
    with cd(doc_dir):
        run("cp -R dev v%s" % version)

@parallel
def unrelease_site():
    with cd(doc_dir):
        run("rm -rf v%s" % version)

@runs_once
def release_github():
    local("git push all master")
    local("git push all v%s" % version)

@runs_once
def release_npm():
    local("npm publish")

@runs_once
def clean():
    local("git clean -fd")

@runs_once
def install_from_scratch():
    local("rm -rf node_modules dev")
    local("npm install")
    local("npm test")

@runs_once
def increment_version(kind="patch"):
    local("npm version %s" % kind)

def release():
    clean()
    install_from_scratch()
    make_site()
    release_site()
    local("./jake release-dep")
