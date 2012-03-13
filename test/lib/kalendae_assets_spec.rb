require 'spec_helper'

describe KalendaeAssets do
  it "must be a module" do
    KalendaeAssets.must_be_instance_of Module
  end

  it "must have an Engine class" do
    KalendaeAssets::Engine.must_be_instance_of Class
  end
end
