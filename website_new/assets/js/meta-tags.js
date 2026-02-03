// meta-tags.js - Dynamic Open Graph & Twitter Card meta tags
// Use this to update meta tags for dynamic pages (ranks, creatures, equipment)

/**
 * Updates meta tags for SEO and social media previews
 * @param {Object} data - Page data
 * @param {string} data.title - Page title
 * @param {string} data.description - Page description
 * @param {string} data.image - Full URL to image
 * @param {string} data.url - Full URL to current page
 * @param {string} data.type - Page type (website, article, profile, etc.)
 */
function updateMetaTags(data) {
    const defaults = {
        title: 'Raldamain - Sistema de Rol',
        description: 'Sistema de rol épico con magia, combate y aventuras.',
        image: `${window.location.origin}/assets/images/raldamain_logo.png`,
        url: window.location.href,
        type: 'website'
    };

    const meta = { ...defaults, ...data };

    // Update document title
    document.title = meta.title;

    // Helper function to update or create meta tag
    function setMetaTag(property, content, isProperty = true) {
        const attr = isProperty ? 'property' : 'name';
        let tag = document.querySelector(`meta[${attr}="${property}"]`);

        if (!tag) {
            tag = document.createElement('meta');
            tag.setAttribute(attr, property);
            document.head.appendChild(tag);
        }

        tag.setAttribute('content', content);
    }

    // Open Graph tags (Facebook, WhatsApp, LinkedIn, Discord)
    setMetaTag('og:title', meta.title);
    setMetaTag('og:description', meta.description);
    setMetaTag('og:image', meta.image);
    setMetaTag('og:url', meta.url);
    setMetaTag('og:type', meta.type);
    setMetaTag('og:site_name', 'Raldamain');

    // Twitter Card tags
    setMetaTag('twitter:card', 'summary_large_image', false);
    setMetaTag('twitter:title', meta.title, false);
    setMetaTag('twitter:description', meta.description, false);
    setMetaTag('twitter:image', meta.image, false);

    // Standard meta tags
    setMetaTag('description', meta.description, false);

    console.log('Meta tags updated:', meta);
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { updateMetaTags };
}
