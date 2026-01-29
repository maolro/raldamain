#!/usr/bin/env python3
"""
Fix markdown links in the Raldamain repository.
Converts absolute URLs, backslashes, and .html links to proper relative .md links.
"""

import os
import re
from pathlib import Path
from typing import Tuple, List, Dict
import argparse

class LinkFixer:
    def __init__(self, root_dir: str, dry_run: bool = True, detect_mode: bool = False, check_broken: bool = False, optimize: bool = False):
        self.root_dir = Path(root_dir).resolve()  # Always use absolute path
        self.dry_run = dry_run
        self.detect_mode = detect_mode
        self.check_broken = check_broken
        self.optimize = optimize
        self.changes = []
        self.unusual_patterns = []
        self.broken_links = []
        self.stats = {
            'files_scanned': 0,
            'files_modified': 0,
            'links_fixed': 0
        }

    def fix_absolute_url(self, link_text: str, link_url: str, current_file: Path) -> str:
        """Convert absolute raldamain.com URLs to relative paths."""
        # Pattern: https://raldamain.com/path/to/file.html
        match = re.match(r'https?://raldamain\.com/(.+?)(?:\.html)?(?:#.*)?$', link_url)
        if not match:
            return None

        url_path = match.group(1)
        # Remove URL encoding
        url_path = url_path.replace('%20', ' ')

        # Convert to relative path from current file
        relative_path = self.make_relative_path(current_file, url_path)

        # Ensure .md extension
        if not relative_path.endswith('.md'):
            relative_path += '.md'

        return relative_path

    def fix_backslash_path(self, link_url: str) -> str:
        """Convert backslashes to forward slashes."""
        if '\\' in link_url:
            return link_url.replace('\\', '/')
        return None

    def fix_hardcoded_path(self, link_url: str, current_file: Path) -> str:
        """Fix hardcoded Windows file system paths."""
        # Pattern: C:\Users\...\raldamain\path\to\file
        match = re.match(r'[A-Z]:\\.*?\\raldamain\\(.+)', link_url, re.IGNORECASE)
        if not match:
            return None

        file_path = match.group(1)
        file_path = file_path.replace('\\', '/')

        # Make relative from current file
        return self.make_relative_path(current_file, file_path)

    def fix_html_extension(self, link_url: str) -> str:
        """Convert .html extensions to .md."""
        if link_url.endswith('.html'):
            # Keep anchor if present
            parts = link_url.split('#')
            parts[0] = parts[0].replace('.html', '.md')
            return '#'.join(parts)
        return None

    def optimize_relative_path(self, link_url: str, current_file: Path) -> str:
        """Optimize overly long relative paths."""
        # Skip external URLs and anchors
        if link_url.startswith(('http://', 'https://', 'mailto:', '#')):
            return None

        # Only optimize paths with ../
        if '../' not in link_url:
            return None

        # Remove anchor for processing
        anchor = ''
        if '#' in link_url:
            link_url, anchor = link_url.split('#', 1)
            anchor = '#' + anchor

        try:
            # Resolve the target
            current_dir = current_file.parent
            target = (current_dir / link_url).resolve()

            # Check if target is within our root
            if not target.is_relative_to(self.root_dir):
                return None

            # Get target relative to root
            target_rel = target.relative_to(self.root_dir)

            # Calculate optimal path
            optimized = self.make_relative_path(current_file, str(target_rel))

            # Only return if we actually shortened it
            original_ups = link_url.count('../')
            optimized_ups = optimized.count('../')

            if optimized_ups < original_ups:
                return optimized + anchor

        except Exception:
            pass

        return None

    def resolve_link_path(self, link_url: str, current_file: Path) -> Path:
        """Resolve a link URL to an absolute file path."""
        # Remove anchor
        url_without_anchor = link_url.split('#')[0]

        # Skip external URLs
        if url_without_anchor.startswith(('http://', 'https://', 'mailto:', 'ftp:')):
            return None

        # Skip anchors only
        if not url_without_anchor:
            return None

        # Get the directory of the current file
        current_dir = current_file.parent

        # Resolve relative path
        try:
            # Handle absolute paths from root (starting with /)
            if url_without_anchor.startswith('/'):
                target_path = self.root_dir / url_without_anchor.lstrip('/')
            else:
                # Relative path
                target_path = current_dir / url_without_anchor

            # Resolve to absolute and normalize
            target_path = target_path.resolve()

            return target_path
        except Exception:
            return None

    def check_link_exists(self, link_text: str, link_url: str, current_file: Path) -> Dict[str, str]:
        """Check if a link destination exists."""
        # Skip external URLs
        if link_url.startswith(('http://', 'https://', 'mailto:', 'ftp:')):
            return None

        # Skip anchor-only links
        if link_url.startswith('#'):
            return None

        target_path = self.resolve_link_path(link_url, current_file)

        if target_path is None:
            return None

        # Check if file exists
        exists = target_path.exists()

        # If .md doesn't exist, try without extension (might be directory)
        if not exists and target_path.suffix == '.md':
            target_without_ext = target_path.with_suffix('')
            if target_without_ext.exists() and target_without_ext.is_dir():
                # Check for index.md in directory
                index_path = target_without_ext / 'index.md'
                if index_path.exists():
                    exists = True

        # Try case-insensitive search on Windows
        if not exists and target_path.parent.exists():
            # List all files in parent directory
            try:
                for file in target_path.parent.iterdir():
                    if file.name.lower() == target_path.name.lower():
                        # Found with different case
                        return {
                            'file': str(current_file.relative_to(self.root_dir)),
                            'link_text': link_text[:50],
                            'link_url': link_url,
                            'resolved_path': str(target_path.relative_to(self.root_dir)) if target_path.is_relative_to(self.root_dir) else str(target_path),
                            'issue': 'case_mismatch',
                            'actual_file': str(file.relative_to(self.root_dir)) if file.is_relative_to(self.root_dir) else str(file)
                        }
            except Exception:
                pass

        if not exists:
            # Try alternative extensions
            alternatives = []
            if target_path.suffix == '.md':
                # Try .html
                html_path = target_path.with_suffix('.html')
                if html_path.exists():
                    alternatives.append(str(html_path.relative_to(self.root_dir)))

            return {
                'file': str(current_file.relative_to(self.root_dir)),
                'link_text': link_text[:50],
                'link_url': link_url,
                'resolved_path': str(target_path.relative_to(self.root_dir)) if target_path.is_relative_to(self.root_dir) else str(target_path),
                'issue': 'not_found',
                'alternatives': alternatives if alternatives else None
            }

        return None

    def detect_unusual_pattern(self, link_text: str, link_url: str, current_file: Path) -> Dict[str, str]:
        """Detect unusual patterns in links that might need attention."""
        patterns = []

        # Skip external links that are clearly intentional
        if link_url.startswith(('http://', 'https://')) and 'raldamain.com' not in link_url:
            return None

        # Pattern 1: Links with mixed case that might cause issues
        if any(c.isupper() for c in link_url) and '/' in link_url:
            path_parts = link_url.split('/')
            if any(part and part[0].isupper() for part in path_parts):
                patterns.append('mixed_case_path')

        # Pattern 2: Links without file extensions (might be directories or broken)
        if not link_url.startswith(('http', '#', 'mailto:')) and '.' not in link_url.split('/')[-1]:
            if not link_url.endswith('/'):
                patterns.append('no_extension')

        # Pattern 3: Links with URL encoding
        if '%' in link_url:
            patterns.append('url_encoded')

        # Pattern 4: Links with backslashes
        if '\\' in link_url:
            patterns.append('backslash')

        # Pattern 5: Absolute paths starting with /
        if link_url.startswith('/') and not link_url.startswith('//'):
            patterns.append('absolute_from_root')

        # Pattern 6: Empty or suspicious links
        if not link_url or link_url in ('#', ''):
            patterns.append('empty_link')

        # Pattern 7: Links with spaces (not URL encoded)
        if ' ' in link_url and not link_url.startswith(('http://', 'https://')):
            patterns.append('unencoded_spaces')

        # Pattern 8: Image links with absolute paths
        if link_url.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp')):
            if link_url.startswith(('C:', 'D:', '/', '\\')):
                patterns.append('absolute_image_path')

        # Pattern 9: Links to .html files
        if '.html' in link_url:
            patterns.append('html_extension')

        # Pattern 10: Anchors without base files (e.g., just #section)
        if link_url.startswith('#') and len(link_url) > 1:
            patterns.append('anchor_only')

        # Pattern 11: Double slashes or dots
        if '//' in link_url or '/./' in link_url:
            patterns.append('redundant_path')

        # Pattern 12: Very long relative paths (might be wrong)
        if link_url.count('../') > 5:
            patterns.append('excessive_parent_traversal')

        if patterns:
            return {
                'file': str(current_file.relative_to(self.root_dir)),
                'link_text': link_text[:50],
                'link_url': link_url,
                'patterns': patterns
            }

        return None

    def make_relative_path(self, current_file: Path, target_path: str) -> str:
        """Calculate optimal relative path from current file to target."""
        # Get directory of current file (where the link is)
        current_dir = current_file.parent

        # Parse target path - make it absolute first
        target = Path(target_path)
        if not target.is_absolute():
            target = self.root_dir / target

        try:
            # Find common ancestor
            # Get all parents of both paths
            current_parents = [current_dir] + list(current_dir.parents)
            target_parents = [target.parent] + list(target.parent.parents)

            # Find the common ancestor
            common_ancestor = None
            for current_p in current_parents:
                if current_p in target_parents:
                    common_ancestor = current_p
                    break

            if not common_ancestor:
                # No common ancestor, fall back to absolute from root
                return target_path

            # Calculate path from current_dir to common_ancestor
            try:
                current_rel = current_dir.relative_to(common_ancestor)
                current_depth = len(current_rel.parts)
            except ValueError:
                current_depth = 0

            # Calculate path from common_ancestor to target
            try:
                target_rel = target.relative_to(common_ancestor)
            except ValueError:
                return target_path

            # Build the relative path
            if current_depth == 0:
                # We're already at or above the common ancestor
                relative = str(target_rel)
            else:
                # Need to go up some levels
                ups = '../' * current_depth
                relative = ups + str(target_rel)

            # Normalize path separators
            relative = relative.replace('\\', '/')

            return relative
        except Exception:
            # If we can't calculate, just return the target as-is
            return target_path

    def fix_link(self, match: re.Match, current_file: Path) -> str:
        """Fix a single link match."""
        full_match = match.group(0)
        link_text = match.group(1)
        link_url = match.group(2)
        anchor = match.group(3) if match.lastindex >= 3 else ''

        # In check broken mode, verify link targets exist
        if self.check_broken:
            broken = self.check_link_exists(link_text, link_url, current_file)
            if broken:
                self.broken_links.append(broken)
            return full_match

        # In detect mode, just collect unusual patterns
        if self.detect_mode:
            unusual = self.detect_unusual_pattern(link_text, link_url, current_file)
            if unusual:
                self.unusual_patterns.append(unusual)
            return full_match

        original_url = link_url
        fixed_url = None
        fix_type = None

        # If optimize mode, only do optimization
        if self.optimize:
            fixed_url = self.optimize_relative_path(link_url, current_file)
            if fixed_url:
                fix_type = 'optimize_path'
        else:
            # Try different fixes in order
            if 'raldamain.com' in link_url:
                fixed_url = self.fix_absolute_url(link_text, link_url, current_file)
                fix_type = 'absolute_url'

            if not fixed_url and ('C:\\' in link_url or 'C:/' in link_url):
                fixed_url = self.fix_hardcoded_path(link_url, current_file)
                fix_type = 'hardcoded_path'

            if not fixed_url:
                fixed_url = self.fix_backslash_path(link_url)
                if fixed_url:
                    fix_type = 'backslash'

            if not fixed_url:
                fixed_url = self.fix_html_extension(link_url)
                if fixed_url:
                    fix_type = 'html_extension'

        # If we fixed something, reconstruct the link
        if fixed_url and fixed_url != original_url:
            self.stats['links_fixed'] += 1
            self.changes.append({
                'file': str(current_file.relative_to(self.root_dir)),
                'type': fix_type,
                'original': original_url,
                'fixed': fixed_url
            })
            return f'[{link_text}]({fixed_url}{anchor})'

        return full_match

    def process_file(self, file_path: Path) -> bool:
        """Process a single markdown file. Returns True if modified."""
        self.stats['files_scanned'] += 1

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            return False

        original_content = content

        # Match markdown links: [text](url) or [text](url#anchor)
        pattern = r'\[([^\]]+)\]\(([^)#]+)(#[^)]+)?\)'

        def replacer(match):
            return self.fix_link(match, file_path)

        content = re.sub(pattern, replacer, content)

        # Check if anything changed
        if content != original_content:
            if not self.dry_run:
                try:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    print(f"[FIXED] {file_path.relative_to(self.root_dir)}")
                except Exception as e:
                    print(f"Error writing {file_path}: {e}")
                    return False
            else:
                print(f"Would fix: {file_path.relative_to(self.root_dir)}")

            self.stats['files_modified'] += 1
            return True

        return False

    def scan_directory(self, exclude_dirs: List[str] = None) -> None:
        """Scan directory for markdown files and fix links."""
        if exclude_dirs is None:
            exclude_dirs = ['node_modules', '_site', '.git', 'chBuilder/chbuilder/node_modules']

        if self.check_broken:
            mode = 'CHECK BROKEN LINKS - '
        elif self.detect_mode:
            mode = 'DETECT MODE - '
        elif self.optimize and self.dry_run:
            mode = 'DRY RUN (OPTIMIZE) - '
        elif self.optimize:
            mode = 'OPTIMIZE - '
        elif self.dry_run:
            mode = 'DRY RUN - '
        else:
            mode = ''

        print(f"{mode}Scanning {self.root_dir}...")
        print()

        # Find all .md files
        for md_file in self.root_dir.rglob('*.md'):
            # Skip excluded directories
            if any(excluded in str(md_file) for excluded in exclude_dirs):
                continue

            self.process_file(md_file)

        # Print summary
        print()
        print("=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print(f"Files scanned: {self.stats['files_scanned']}")

        if self.check_broken:
            print(f"Broken links found: {len(self.broken_links)}")

            if self.broken_links:
                # Group by issue type
                not_found = [x for x in self.broken_links if x['issue'] == 'not_found']
                case_mismatch = [x for x in self.broken_links if x['issue'] == 'case_mismatch']

                print()
                print(f"  Not found: {len(not_found)}")
                print(f"  Case mismatch: {len(case_mismatch)}")

                print()
                print("=" * 60)
                print("BROKEN LINKS (file not found)")
                print("=" * 60)
                for item in not_found:
                    print(f"\nFile: {item['file']}")
                    print(f"  Link text: [{item['link_text']}]")
                    print(f"  Link URL: {item['link_url']}")
                    print(f"  Resolved to: {item['resolved_path']}")
                    if item.get('alternatives'):
                        print(f"  Alternatives found: {', '.join(item['alternatives'])}")

                if case_mismatch:
                    print()
                    print("=" * 60)
                    print("CASE MISMATCHES")
                    print("=" * 60)
                    for item in case_mismatch:
                        print(f"\nFile: {item['file']}")
                        print(f"  Link text: [{item['link_text']}]")
                        print(f"  Link URL: {item['link_url']}")
                        print(f"  Expected: {item['resolved_path']}")
                        print(f"  Actual: {item['actual_file']}")

        elif self.detect_mode:
            print(f"Unusual patterns found: {len(self.unusual_patterns)}")

            if self.unusual_patterns:
                # Group by pattern type
                pattern_counts = {}
                for item in self.unusual_patterns:
                    for pattern in item['patterns']:
                        pattern_counts[pattern] = pattern_counts.get(pattern, 0) + 1

                print()
                print("Pattern breakdown:")
                for pattern, count in sorted(pattern_counts.items(), key=lambda x: x[1], reverse=True):
                    print(f"  {pattern}: {count} occurrences")

                print()
                print("Sample unusual patterns (first 20):")
                for item in self.unusual_patterns[:20]:
                    print(f"  {item['file']}")
                    print(f"    Text: [{item['link_text']}]")
                    print(f"    URL: {item['link_url']}")
                    print(f"    Issues: {', '.join(item['patterns'])}")
                    print()

                if len(self.unusual_patterns) > 20:
                    print(f"  ... and {len(self.unusual_patterns) - 20} more unusual patterns")
        else:
            print(f"Files modified: {self.stats['files_modified']}")
            print(f"Links fixed: {self.stats['links_fixed']}")

            if self.changes and self.dry_run:
                print()
                print("Sample changes:")
                for change in self.changes[:10]:
                    print(f"  {change['file']}")
                    print(f"    [{change['type']}] {change['original']}")
                    print(f"    -> {change['fixed']}")
                    print()

                if len(self.changes) > 10:
                    print(f"  ... and {len(self.changes) - 10} more changes")

def main():
    parser = argparse.ArgumentParser(
        description='Fix markdown links in Raldamain repository',
        epilog="""
Examples:
  python fix_links.py                    # Preview all fixes
  python fix_links.py --run              # Apply all fixes
  python fix_links.py --optimize         # Preview path optimizations
  python fix_links.py --optimize --run   # Apply path optimizations
  python fix_links.py --detect           # Find unusual patterns
  python fix_links.py --check-broken     # Find broken links
        """,
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument('--run', action='store_true',
                       help='Actually fix files (default is dry-run)')
    parser.add_argument('--dir', default='.',
                       help='Root directory to scan (default: current directory)')
    parser.add_argument('--detect', action='store_true',
                       help='Detect unusual link patterns without fixing')
    parser.add_argument('--check-broken', action='store_true',
                       help='Check for broken links (destination files not found)')
    parser.add_argument('--optimize', action='store_true',
                       help='Optimize relative paths to be shorter (can combine with --run)')

    args = parser.parse_args()

    # Validate mutually exclusive options
    detection_modes = sum([args.detect, args.check_broken])
    if detection_modes > 1:
        print("Error: Can only use one of --detect or --check-broken")
        return

    if detection_modes > 0 and args.optimize:
        print("Error: Cannot combine detection modes with --optimize")
        return

    fixer = LinkFixer(args.dir,
                     dry_run=not args.run,
                     detect_mode=args.detect,
                     check_broken=args.check_broken,
                     optimize=args.optimize)
    fixer.scan_directory()

    if args.check_broken and fixer.broken_links:
        print()
        print("Found broken links that need fixing")
    elif args.detect and fixer.unusual_patterns:
        print()
        print("Use this information to enhance the fixing patterns in the script")
    elif fixer.dry_run and fixer.stats['links_fixed'] > 0:
        print()
        if args.optimize:
            print("Run with --optimize --run to apply these optimizations")
        else:
            print("Run with --run to apply these changes")

if __name__ == '__main__':
    main()
