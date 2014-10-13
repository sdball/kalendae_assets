# -*- encoding: utf-8 -*-
require File.expand_path('../lib/kalendae_assets/version', __FILE__)

Gem::Specification.new do |gem|
  gem.authors       = ["Stephen Ball"]
  gem.email         = ["sdball@gmail.com"]
  gem.description   = "Make Kalendae available in the Rails asset pipeline."
  gem.summary       = "Make Kalendae available in the Rails asset pipeline."
  gem.homepage      = "https://github.com/sdball/kalendae_assets"

  gem.executables   = `git ls-files -- bin/*`.split("\n").map{ |f| File.basename(f) }
  gem.files         = `git ls-files`.split("\n")
  gem.test_files    = `git ls-files -- {test,spec,features}/*`.split("\n")
  gem.name          = "kalendae_assets"
  gem.require_paths = ["lib"]
  gem.version       = KalendaeAssets::VERSION
  gem.add_dependency 'rails', '>= 3.1'
  gem.add_development_dependency 'appraisal'
  gem.add_development_dependency 'sqlite3'
  gem.add_development_dependency 'minitest'
  gem.add_development_dependency 'capybara'
  gem.add_development_dependency 'turn'
end
