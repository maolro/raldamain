require 'nokogiri'
require 'jekyll/utils'

module Jekyll
  module CustomFilters
    def sluggify_local_links(content)
      # Parse the HTML content
      doc = Nokogiri::HTML.fragment(content)
      
      # Loop through all A HREF tags
      doc.css('a[href]').each do |link|
        href = link['href']
        
        # Check if the link is a local link (not starting with http)
        unless href.start_with?('http')
          # Generate a slug and update the href with #
          slug = Jekyll::Utils.slugify(href)
          link['href'] = "##{slug}"
        end
      end

      # Return the modified HTML content
      doc.to_html
    end
  end
end

Liquid::Template.register_filter(Jekyll::CustomFilters)
