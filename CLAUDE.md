# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Raldamain is a tabletop RPG system website combining static documentation (Jekyll) with interactive character building tools. The project is a monorepo containing:

- **Jekyll Static Site**: Main documentation website for game rules, world lore, campaigns, locations, and factions
- **Vue.js Character Viewer**: Legacy character sheet application in `/character/`
- **React Character Builder**: Modern character creation tool in `/chBuilder/chbuilder/`

The site is deployed to GitHub Pages at raldamain.com, with content primarily in Spanish (`lang: es`) and an English section under `/en/`.

## Development Commands

### Jekyll Site (Main Documentation)

```bash
# Install Ruby dependencies
bundle install

# Run development server (with auto-reload)
bundle exec jekyll serve

# Build static site to _site/
bundle exec jekyll build

# Build with specific baseurl (for GitHub Pages)
bundle exec jekyll build --baseurl "/path"
```

### React Character Builder

```bash
cd chBuilder/chbuilder

# Install dependencies
npm install

# Run development server (port 3000)
npm start

# Production build
npm run build

# Run tests
npm test
```

### Document Export (Pandoc)

```bash
# Convert markdown to DOCX/HTML
docbuilder.bat

# Test document conversion
doc_test.bat
```

## Architecture

### Content Pipeline

1. **Content Sources**: Markdown files in `/rules/`, `/world/`, `/campaign/`, `/locations/`, `/factions/`, `/lore/`
2. **Jekyll Processing**: Liquid templates in `_layouts/` + includes in `_includes/` → Static HTML
3. **Data Layer**: YAML files in `_data/` provide metadata and infobox field definitions
4. **Frontend Apps**: Load JSON game data dynamically for character building

### Key Directories

- `_layouts/`: Jinja2-like HTML templates (base, campaign, character, rule pages)
- `_includes/`: Reusable HTML components (nav, footer, infobox, breadcrumbs, TOC)
- `_data/`: YAML data files for site configuration and infobox definitions
- `_plugins/`: Custom Jekyll plugins (e.g., `slugify_links.rb` for URL generation)
- `_sass/`: SCSS stylesheets compiled to CSS
- `assets/`: Static resources (CSS, JS, images)
- `character/`: Vue.js character sheet viewer with game mechanics
- `chBuilder/chbuilder/`: React character creation app (Create React App)
- `rules/`: Game rules documentation organized by category
- `world/`: World lore, NPCs, locations, factions, history, religions
- `campaign/`: Campaign-specific content

### Jekyll Configuration

- **Markdown Parser**: Kramdown with GitHub-flavored markdown (GFM)
- **Plugins**: jekyll-sitemap, jekyll-seo-tag, jekyll-relative-links, jekyll-include-cache
- **Safe Mode**: Disabled to allow custom plugins
- **Output**: `_site/` directory (gitignored)

### Layout System

Jekyll uses scope-based layout defaults in `_config.yml`:
- `/en/` → English content with `layout: rule`
- `/characters/`, `/locations/`, `/factions/` → `layout: character`
- `/world/`, `/rules/` → `layout: rule`
- `/campaign/` → `layout: campaign`

### Data Flow

1. Content authors write Markdown files with YAML frontmatter
2. Jekyll processes Markdown + Liquid templates → HTML
3. Vue/React apps fetch JSON data files (character stats, items, spells, etc.)
4. Static output deployed to GitHub Pages on push to `master`

## Important Implementation Details

### Character Data Structure

The character system uses complex nested JSON for:
- **Stats**: Physical, mental, social attributes with modifiers
- **Talents**: Skill trees with prerequisites and ranks
- **Equipment**: Weapons, armor, items with encumbrance calculation
- **Spells**: Multiple magic systems (elementalism, arcane, divine, occultism)
- **Combat**: Initiative, defense, attack rolls, damage calculation

### Custom Jekyll Plugins

Located in `_plugins/`:
- `slugify_links.rb`: Generates URL-safe slugs from page titles for internal linking

### GitHub Actions Deployment

Workflow in `.github/workflows/jekyll.yml`:
- Triggers on push to `master` branch
- Runs on Ubuntu 22.04 with Ruby 3.1
- Command: `bundle exec jekyll build --baseurl "${{ steps.pages.outputs.base_path }}"`
- Environment variable: `JEKYLL_ENV=production`

### Multi-language Support

Site supports Spanish (default) and English:
- Spanish content at root level
- English content under `/en/` directory
- Language set via frontmatter `lang` property
- Config default: `lang: es`

## Technology Stack

- **Backend**: Jekyll 4.3.2, Ruby 3.1, Liquid templating
- **Frontend**: Vue.js 3, React 18.3.1, Bootstrap 5.3.0, jQuery 3.4.1
- **Build Tools**: npm, Create React App, Bundler
- **Styling**: Bootstrap, Bootstrap Select, Bootstrap Icons, SCSS
- **Content**: Markdown (Kramdown), YAML
- **Deployment**: GitHub Pages, GitHub Actions
- **Document Processing**: Pandoc, Lua scripts

## Frontend Applications

### Vue.js Character Viewer (`/character/`)

- Main entry: `main.js` (Vue instance managing character state)
- Uses MDB5 UI kit for styling
- Loads game data from JSON files dynamically
- Complex form state management for character creation

### React Character Builder (`/chBuilder/chbuilder/`)

- Bootstrapped with Create React App
- Currently in development (v0.1.0)
- Standard CRA project structure
- Testing setup with Jest and React Testing Library
