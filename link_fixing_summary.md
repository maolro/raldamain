# Link Fixing Summary

## Scripts Created

### 1. `fix_links.py` - Main Link Fixer
Fixes common link issues and optimizes paths.

**Features:**
- Convert absolute URLs to relative paths
- Fix `.html` to `.md` extensions
- Replace Windows backslashes with forward slashes
- Remove hardcoded file system paths
- Optimize overly long relative paths
- Detect unusual patterns
- Check for broken links

**Usage:**
```bash
python fix_links.py                  # Preview fixes
python fix_links.py --run            # Apply fixes
python fix_links.py --optimize       # Preview path optimizations
python fix_links.py --optimize --run # Apply path optimizations
python fix_links.py --detect         # Find unusual patterns
python fix_links.py --check-broken   # Find broken links
```

### 2. `fix_broken_links.py` - Intelligent Link Fixer
Uses fuzzy matching to fix broken links where files exist with minor variations.

**Features:**
- Case-insensitive matching
- Fixes underscore vs hyphen differences (`magia_arcana` → `magia-arcana`)
- Fixes URL encoding (`%20` → spaces)
- Fixes malformed URLs (www.raldamain.com)
- Conservative matching (95%+ similarity required)

**Usage:**
```bash
python fix_broken_links.py           # Preview intelligent fixes
python fix_broken_links.py --run     # Apply intelligent fixes
```

## Results

### Phase 1: Standard Fixes
- **383 bad links fixed** in 68 files
  - Absolute URLs → relative paths
  - `.html` → `.md` extensions
  - Windows backslashes → forward slashes
  - Hardcoded paths removed

### Phase 2: Path Optimization
- **298 paths shortened** in 51 files
  - Removed unnecessary `../` traversals
  - Example: `../../../../../en/characters/...` → `../../../../characters/...`

### Phase 3: Intelligent Fixes
- **30 broken links fixed** in 10 files
  - Case mismatches corrected
  - URL encoding issues fixed
  - Malformed www.raldamain.com URLs fixed

### Current Status
- **Broken links: 94** (down from 124)
- Most remaining broken links are files that don't exist yet
- All fixable issues with existing files have been resolved

## Files Generated
- `broken_links_report.txt` - Complete list of 124 originally broken links
- `fix_links.py` - Main link fixing script
- `fix_broken_links.py` - Intelligent link fixing script

## Link Standards Adopted
All links now follow:
- **Relative paths** (e.g., `../rules/rangos/index.md`)
- **Forward slashes** `/` only
- **`.md` extensions** on all markdown files
- **No URL encoding** - literal spaces in paths
- **Optimized paths** - shortest possible `../` traversal

This format is:
✓ Compatible with most MD editors
✓ Works with Jekyll's jekyll-relative-links plugin
✓ Portable across operating systems
✓ Human-readable and maintainable
