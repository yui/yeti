from fabric.api import *
from fabric.contrib.project import rsync_project
import json

metadata = json.loads(open("package.json", "r").read())

try:
    hosts = json.loads(open(".hosts.json", "r").read())
except IOError:
    print "Specify hosts to deploy to in .hosts.json first."
    exit()

env.user = "rburke"
env.hosts = hosts
env.parallel = True

doc_dir = "public/doc"
version = metadata["version"]

def prepare_site():
    local("make clean html-api html coverage")

def deploy_site():
    target = doc_dir + "/dev/"
    rsync_project(remote_dir=target, local_dir="build_docs/")

def release_site():
    deploy_site()
    with cd(doc_dir):
        run("cp -R dev v%s" % version)

def unrelease_site():
    with cd(doc_dir):
        run("rm -rf v%s" % version)

def release_github():
    local("git tag v%s" % version)
    local("git push all v%s" % version)

def release_npm():
    local("rm dep/dev")
    local("npm publish")
    local("./jake dep")

def release():
    local("git clean -fd")
    release_site()
    release_github()
    release_npm()
