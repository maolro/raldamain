// =============================================
// WORLD LOADER - Loads and renders world articles
// Handles Obsidian-style links and markdown content
// =============================================

let worldIndex = null;
let articleLookup = {};

document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname;
    const segments = path.split('/').filter(part => part.length > 0);
    const articleId = segments[segments.length - 1];

    console.log("Article ID:", articleId);

    loadWorldIndex().then(() => {
        loadArticle(articleId);
    });
});

// Load the world index and build lookup tables
async function loadWorldIndex() {
    try {
        const response = await fetch('/data/world_index.json');
        worldIndex = await response.json();
        buildArticleLookup();
    } catch (error) {
        console.error('Error loading world index:', error);
    }
}

// Build a lookup table for quick article resolution
function buildArticleLookup() {
    worldIndex.categories.forEach(category => {
        if (category.articles) {
            category.articles.forEach(article => {
                articleLookup[article.id] = {
                    ...article,
                    category: category.name,
                    categoryId: category.id,
                    categoryColor: category.color
                };
                // Also index by name (lowercase) for Obsidian links
                articleLookup[article.name.toLowerCase()] = articleLookup[article.id];
            });
        }
        if (category.subcategories) {
            category.subcategories.forEach(subcat => {
                subcat.articles.forEach(article => {
                    articleLookup[article.id] = {
                        ...article,
                        category: category.name,
                        categoryId: category.id,
                        categoryColor: category.color,
                        subcategory: subcat.name
                    };
                    articleLookup[article.name.toLowerCase()] = articleLookup[article.id];
                });
            });
        }
    });
}

// Parse YAML frontmatter and return metadata + content
function parseFrontmatter(markdown) {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = markdown.match(frontmatterRegex);

    if (!match) {
        return { metadata: {}, content: markdown };
    }

    const yamlString = match[1];
    const content = match[2];
    const metadata = {};

    // Simple YAML parsing for key: value pairs
    yamlString.split('\n').forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim();
            let value = line.substring(colonIndex + 1).trim();
            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            metadata[key] = value;
        }
    });

    return { metadata, content };
}

// Load and render an article
async function loadArticle(articleId) {
    const articleInfo = articleLookup[articleId];

    if (!articleInfo) {
        showError('Artículo no encontrado');
        return;
    }

    // Update page metadata
    document.title = `${articleInfo.name} | El Mundo de Raldamain`;
    document.getElementById('article-title').innerText = articleInfo.name;
    document.getElementById('breadcrumb-category').innerText = articleInfo.category;
    document.getElementById('breadcrumb-category-link').href = `/mundo/categoria/${articleInfo.categoryId}`;
    document.getElementById('breadcrumb-article').innerText = articleInfo.name;

    // Load markdown content
    try {
        const response = await fetch(`/data/world/${articleInfo.file}`);
        if (!response.ok) throw new Error('File not found');

        let rawMarkdown = await response.text();

        // Parse frontmatter to get metadata and content
        const { metadata, content } = parseFrontmatter(rawMarkdown);

        // Set hero image if available
        setHeroImage(metadata, articleInfo);

        // Build infobox from metadata
        buildInfobox(metadata, articleInfo);

        // Process Obsidian links before rendering
        let processedContent = processObsidianLinks(content);

        // Render markdown
        const html = marked.parse(processedContent);

        // Display content
        document.getElementById('article-content').innerHTML = html;

        // Build hierarchical table of contents
        buildTableOfContents();

        // Find related articles
        findRelatedArticles(articleInfo);

    } catch (error) {
        console.error('Error loading article:', error);
        showError('No se pudo cargar el contenido del artículo');
    }
}

// Set hero background image from metadata or category color
function setHeroImage(metadata, articleInfo) {
    const hero = document.getElementById('hero-section');

    if (metadata.image) {
        // Image path from frontmatter
        const imagePath = `/assets/images/world/${metadata.image}`;
        hero.style.background = `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.85)), url('${imagePath}') center/cover`;
    } else {
        // Fallback to category color gradient
        const color = articleInfo.categoryColor || '#333';
        hero.style.background = `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.8)), linear-gradient(135deg, ${color} 0%, #1a1a1a 100%)`;
    }
}

// Build infobox from frontmatter metadata
function buildInfobox(metadata, articleInfo) {
    const infoboxContainer = document.getElementById('article-infobox');
    if (!infoboxContainer) return;

    // Define which metadata fields to show in infobox
    const infoboxFields = {
        'tipo': 'Tipo',
        'type': 'Tipo',
        'capital': 'Capital',
        'gobierno': 'Gobierno',
        'religion': 'Religión',
        'poblacion': 'Población',
        'region': 'Región',
        'fundacion': 'Fundación',
        'lider': 'Líder',
        'alineamiento': 'Alineamiento',
        'dominios': 'Dominios',
        'simbolo': 'Símbolo',
        'sede': 'Sede',
        'miembros': 'Miembros'
    };

    let hasInfoboxContent = false;
    let infoboxHTML = '<div class="infobox">';

    // Add title
    infoboxHTML += `<div class="infobox-title">${articleInfo.name}</div>`;

    // Add image if present
    if (metadata.image) {
        infoboxHTML += `<div class="infobox-image"><img src="/assets/images/world/${metadata.image}" alt="${articleInfo.name}"></div>`;
        hasInfoboxContent = true;
    }

    // Add category badge
    infoboxHTML += `<div class="infobox-category" style="background-color: ${articleInfo.categoryColor || '#666'};">${articleInfo.category}</div>`;

    // Add metadata fields
    infoboxHTML += '<div class="infobox-fields">';
    for (const [key, label] of Object.entries(infoboxFields)) {
        if (metadata[key]) {
            infoboxHTML += `
                <div class="infobox-field">
                    <span class="infobox-label">${label}</span>
                    <span class="infobox-value">${metadata[key]}</span>
                </div>
            `;
            hasInfoboxContent = true;
        }
    }
    infoboxHTML += '</div></div>';

    // Only show infobox if there's meaningful content
    if (hasInfoboxContent) {
        infoboxContainer.innerHTML = infoboxHTML;
        infoboxContainer.style.display = 'block';
    } else {
        infoboxContainer.style.display = 'none';
    }
}

// Process Obsidian-style links: [[Page Name]] and [[Page Name|Display Text]]
function processObsidianLinks(markdown) {
    // Handle [[Page Name|Display Text]] format
    markdown = markdown.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (match, pageName, displayText) => {
        const articleId = resolveArticleLink(pageName);
        if (articleId) {
            return `[${displayText}](/mundo/articulo/${articleId})`;
        }
        return displayText;
    });

    // Handle [[Page Name]] format
    markdown = markdown.replace(/\[\[([^\]]+)\]\]/g, (match, pageName) => {
        const articleId = resolveArticleLink(pageName);
        if (articleId) {
            return `[${pageName}](/mundo/articulo/${articleId})`;
        }
        return pageName;
    });

    // Also handle relative markdown links: [text](../../path/file.md)
    markdown = markdown.replace(/\[([^\]]+)\]\(([^)]+\.md)\)/g, (match, text, path) => {
        const articleId = resolvePathToArticle(path);
        if (articleId) {
            return `[${text}](/mundo/articulo/${articleId})`;
        }
        return text;
    });

    return markdown;
}

// Resolve a page name to an article ID
function resolveArticleLink(pageName) {
    const lookupKey = pageName.toLowerCase().trim();
    if (articleLookup[lookupKey]) {
        return articleLookup[lookupKey].id;
    }

    const idFormat = pageName.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '');
    if (articleLookup[idFormat]) {
        return idFormat;
    }

    for (const [key, article] of Object.entries(articleLookup)) {
        if (article.name && article.name.toLowerCase().includes(lookupKey)) {
            return article.id;
        }
    }

    console.warn(`Could not resolve Obsidian link: ${pageName}`);
    return null;
}

// Resolve a relative path to an article ID
function resolvePathToArticle(path) {
    const filename = path.split('/').pop().replace('.md', '');
    const idFormat = filename.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '');

    if (articleLookup[idFormat]) {
        return idFormat;
    }

    for (const [key, article] of Object.entries(articleLookup)) {
        if (article.file && article.file.toLowerCase().includes(filename.toLowerCase())) {
            return article.id;
        }
    }

    console.warn(`Could not resolve path: ${path}`);
    return null;
}

// Build hierarchical table of contents from headings
function buildTableOfContents() {
    const content = document.getElementById('article-content');
    const headers = content.querySelectorAll('h1, h2, h3, h4');
    const toc = document.getElementById('table-of-contents');

    if (headers.length === 0) {
        toc.innerHTML = '<p style="color: #888; font-size: 0.9rem;">Sin secciones</p>';
        return;
    }

    // Build hierarchical structure
    let tocHTML = '<ul class="toc-list">';
    let currentH1Open = false;
    let currentH2Open = false;

    headers.forEach((header, index) => {
        const headerId = `section-${index}`;
        header.id = headerId;
        const level = header.tagName.toLowerCase();
        const text = header.textContent;

        if (level === 'h1') {
            // Close any open sublists
            if (currentH2Open) { tocHTML += '</ul></li>'; currentH2Open = false; }
            if (currentH1Open) { tocHTML += '</ul></li>'; currentH1Open = false; }

            tocHTML += `<li class="toc-item toc-h1"><a href="#${headerId}" class="toc-link">${text}</a>`;
            currentH1Open = true;
            tocHTML += '<ul class="toc-sublist">';
        } else if (level === 'h2') {
            // Close h3 sublist if open
            if (currentH2Open) { tocHTML += '</ul></li>'; currentH2Open = false; }

            tocHTML += `<li class="toc-item toc-h2"><a href="#${headerId}" class="toc-link">${text}</a>`;
            currentH2Open = true;
            tocHTML += '<ul class="toc-sublist">';
        } else if (level === 'h3' || level === 'h4') {
            tocHTML += `<li class="toc-item toc-h3"><a href="#${headerId}" class="toc-link">${text}</a></li>`;
        }
    });

    // Close any remaining open tags
    if (currentH2Open) tocHTML += '</ul></li>';
    if (currentH1Open) tocHTML += '</ul></li>';
    tocHTML += '</ul>';

    toc.innerHTML = tocHTML;

    // Smooth scroll for TOC links
    toc.querySelectorAll('.toc-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const target = document.getElementById(targetId);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

// Find and display related articles based on category
function findRelatedArticles(currentArticle) {
    const relatedSection = document.getElementById('related-section');
    const relatedContainer = document.getElementById('related-articles');

    const category = worldIndex.categories.find(c => c.id === currentArticle.categoryId);
    if (!category) return;

    let relatedArticles = [];

    if (category.articles) {
        relatedArticles = category.articles.filter(a => a.id !== currentArticle.id);
    }

    if (category.subcategories) {
        category.subcategories.forEach(subcat => {
            relatedArticles = relatedArticles.concat(
                subcat.articles.filter(a => a.id !== currentArticle.id)
            );
        });
    }

    relatedArticles = relatedArticles.slice(0, 5);

    if (relatedArticles.length > 0) {
        relatedSection.style.display = 'block';
        relatedContainer.innerHTML = relatedArticles.map(article => `
            <a href="/mundo/articulo/${article.id}" class="related-link">${article.name}</a>
        `).join('');
    }
}

// Show error message
function showError(message) {
    document.getElementById('article-title').innerText = 'Error';
    document.getElementById('article-content').innerHTML = `
        <div style="text-align: center; padding: 3rem;">
            <p style="color: #ff6b6b; font-size: 1.2rem;">${message}</p>
            <a href="/mundo" style="color: var(--accent-gold); margin-top: 1rem; display: inline-block;">Volver al Mundo</a>
        </div>
    `;
}
