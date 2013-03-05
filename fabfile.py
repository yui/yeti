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

def prepare_deploy():
    local("make clean html-api html coverage")

def deploy():
    target = doc_dir + "/dev/"
    rsync_project(remote_dir=target, local_dir="build_docs/")

def deploy_release():
    deploy()
    with cd(doc_dir):
        run("cp -R dev v%s" % metadata["version"])

def undeploy_release():
    with cd(doc_dir):
        run("rm -rf v%s" % metadata["version"])
