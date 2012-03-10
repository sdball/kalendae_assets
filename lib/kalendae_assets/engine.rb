module KalendaeAssets
  class Engine < ::Rails::Engine
    initializer 'kalendae_assets.load_static_assets' do |app|
      app.middleware.use ::ActionDispatch::Static, "#{root}/vendor"
    end
  end
end
