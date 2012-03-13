require 'spec_helper'

describe "Kalendae Assets integration" do
  it "provides kalendae.js on the asset pipeline" do
    visit '/assets/kalendae.js'
    page.text.must_include 'http://github.com/ChiperSoft/Kalendae'
    page.text.must_include 'var Kalendae = function (targetElement, options) {'
  end

  it "provides kalendae.css on the asset pipeline" do
    visit '/assets/kalendae.css'
    page.text.must_include '.kalendae {'
  end
end
