# Kalendae Assets [![Build Status](https://secure.travis-ci.org/sdball/kalendae_assets.png?branch=master)](http://travis-ci.org/sdball/kalendae_assets)


## Installation

**Step 1**

Load `kalendae_assets` in your `Gemfile` as part of the `assets` group

    group :assets do
      gem 'kalendae_assets'
    end

**Step 2**

Run 'bundle install'

**Step 3**

Require `kalendae.js` in your Javascript manifest (e.g. `application.js`)

    //= require kalendae

**Step 4**

Require `kalendae.css` in your CSS manifest (e.g. `application.css`)

     *= require kalendae

## Usage

See [Kalendae's Documentation](https://github.com/ChiperSoft/Kalendae) for full
usage instructions.

If you just want to get a quick date picker going: add `auto-kal` as a class to
any element that you want to attach a date picker to.

    <div class="auto-kal"></div>

    <%= f.text_field :date, :class => 'auto-kal' %>

## Contributing

1. Fork it
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Added some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create new Pull Request
