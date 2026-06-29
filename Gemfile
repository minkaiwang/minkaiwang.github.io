source "https://rubygems.org"

# Ruby 4 removed taint tracking, while Liquid 4 still calls `tainted?`.
# Defining it here lets Bundler patch the build process before Jekyll loads.
class Object
  def tainted?
    false
  end
end

gem "jekyll", "~> 4.3"
gem "csv"
gem "bigdecimal"
gem "faraday-retry"
gem "tzinfo-data"
gem "webrick", "~> 1.8"

group :jekyll_plugins do
  gem "jekyll-feed"
  gem "jekyll-gist"
  gem "jekyll-paginate"
  gem "jekyll-redirect-from"
  gem "jekyll-sitemap"
  gem "jemoji"
end
