# install all the shit you need to host this
require 'fileutils'

express_version  = ENV['EXPRESS_VERSION'] || '1.0.0beta'
class_js_version  = ENV['CLASS_JS_VERSION'] || '0.3.0'
vendor_directory = File.join(File.dirname(__FILE__), 'vendor')

desc "Package express to vendor/ for deployment"
task :setup do |t|
  FileUtils.mkdir_p vendor_directory
  Dir.chdir(vendor_directory) do
    if File.directory?('express')
      puts "You already have a copy of express"
    else
      system("git clone git://github.com/visionmedia/express.git")
      Dir.chdir("express") do
        system("git checkout #{express_version}")
        system("git submodule init")
        system("git submodule update")
        system("rm -rf .git")
        system("rm -rf .gitmodules")
      end
      Dir['express/*'].each do |file|
        FileUtils.rm_rf(file) unless file =~ %r!express/(lib|support)!
      end
      Dir['express/support/*/*'].each do |file|
        FileUtils.rm_rf(file) unless file =~ %r!express/support/\w+/lib!
      end
      Dir['express/support/*/.git'].each do |file|
        FileUtils.rm_rf(file)
      end
    end
    if File.directory?('class')
      puts "You already have a copy of class"
    else
      system("git clone git://github.com/visionmedia/class.js.git class")
      Dir.chdir("class") do
        system("git checkout #{class_js_version}")
        system("rm -rf .git")
        system("rm -rf .gitmodules")
      end
      Dir['class/*'].each do |file|
        FileUtils.rm_rf(file) unless file =~ %r!class/lib!
      end
    end
  end
end
task :default => :setup
