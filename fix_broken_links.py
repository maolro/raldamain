#!/usr/bin/env python3
"""
Intelligently fix broken links by finding similar files.
"""

import os
import re
from pathlib import Path
from typing import Dict, List, Optional
from difflib import SequenceMatcher

class IntelligentLinkFixer:
    def __init__(self, root_dir: str, dry_run: bool = True):
        self.root_dir = Path(root_dir).resolve()
        self.dry_run = dry_run
        self.fixes = []
        self.stats = {
            'files_scanned': 0,
            'files_modified': 0,
            'links_fixed': 0,
            'unfixable': 0
        }

        # Build file index for fast lookups
        print("Building file index...")
        self.file_index = self._build_file_index()
        print(f"Indexed {len(self.file_index)} files")

    def _build_file_index(self) -> Dict[str, Path]:
        """Build index of all markdown files for fast lookup."""
        index = {}
        for md_file in self.root_dir.rglob('*.md'):
            if any(excluded in str(md_file) for excluded in ['node_modules', '_site', '.git']):
                continue

            # Store with relative path
            rel_path = md_file.relative_to(self.root_dir)
            # Store both with and without extension for matching
            index[str(rel_path).lower()] = md_file
            index[str(rel_path.with_suffix('')).lower()] = md_file

        return index

    def find_similar_file(self, broken_path: Path, threshold: float = 0.95) -> Optional[Path]:
        """Find a file similar to the broken path - CONSERVATIVE approach."""
        broken_str = str(broken_path).lower().replace('\\', '/')

        # First try exact case-insensitive match
        if broken_str in self.file_index:
            return self.file_index[broken_str]

        # Try without .md extension
        broken_no_ext = str(broken_path.with_suffix('')).lower().replace('\\', '/')
        if broken_no_ext in self.file_index:
            return self.file_index[broken_no_ext]

        # Only do fuzzy matching if similarity is VERY high (95%+)
        # This catches typos and case issues but not wrong files
        best_match = None
        best_score = threshold

        for indexed_path_str, indexed_path in self.file_index.items():
            indexed_rel = str(indexed_path.relative_to(self.root_dir)).replace('\\', '/')

            # Calculate similarity
            score = SequenceMatcher(None, broken_str, indexed_rel.lower()).ratio()

            if score > best_score:
                # Additional check: filenames should match or be very similar
                broken_filename = broken_path.name.lower()
                indexed_filename = indexed_path.name.lower()

                filename_similarity = SequenceMatcher(None, broken_filename, indexed_filename).ratio()

                # Only accept if filename is at least 80% similar
                if filename_similarity >= 0.8:
                    best_score = score
                    best_match = indexed_path

        return best_match

    def resolve_broken_link(self, current_file: Path, link_url: str) -> Optional[str]:
        """Try to resolve a broken link to a valid file."""
        # Remove anchor
        url_without_anchor = link_url.split('#')[0]
        anchor = '#' + link_url.split('#')[1] if '#' in link_url else ''

        # Skip external URLs
        if url_without_anchor.startswith(('http://', 'https://', 'mailto:')):
            return None

        # Calculate what the link was trying to point to
        current_dir = current_file.parent

        try:
            # Handle malformed URLs with www.raldamain.com
            if 'www.raldamain.com' in url_without_anchor or 'raldamain.com' in url_without_anchor:
                # Extract the actual path from the URL
                parts = url_without_anchor.split('/')
                # Find where the actual path starts (after domain)
                if 'characters' in parts:
                    idx = parts.index('characters')
                    path_parts = parts[idx:]
                    # Try to find this in world or campaign
                    possible_paths = [
                        'world/personajes/' + '/'.join(path_parts[1:]),
                        'campaign/caballeros de ustilus/personajes/' + path_parts[-1],
                    ]
                    for possible in possible_paths:
                        possible_path = self.root_dir / possible
                        if possible_path.with_suffix('.md').exists():
                            # Calculate relative path
                            return self._make_relative(current_file, possible_path.with_suffix('.md')) + anchor

            # Resolve the target
            if url_without_anchor.startswith('/'):
                target = self.root_dir / url_without_anchor.lstrip('/')
            else:
                target = current_dir / url_without_anchor

            target = target.resolve()

            # If file doesn't exist, try to find similar
            if not target.exists():
                # Get relative path for searching
                try:
                    rel_target = target.relative_to(self.root_dir)
                except ValueError:
                    return None

                similar = self.find_similar_file(rel_target)

                if similar:
                    # Calculate new relative path
                    new_link = self._make_relative(current_file, similar)
                    return new_link + anchor

        except Exception:
            pass

        return None

    def _make_relative(self, from_file: Path, to_file: Path) -> str:
        """Make a relative path from one file to another."""
        from_dir = from_file.parent

        try:
            # Find common ancestor
            from_parents = [from_dir] + list(from_dir.parents)
            to_parents = [to_file.parent] + list(to_file.parent.parents)

            common = None
            for p in from_parents:
                if p in to_parents:
                    common = p
                    break

            if not common:
                return str(to_file.relative_to(self.root_dir))

            # Calculate depth
            try:
                from_rel = from_dir.relative_to(common)
                depth = len(from_rel.parts)
            except ValueError:
                depth = 0

            # Calculate target path
            to_rel = to_file.relative_to(common)

            if depth == 0:
                result = str(to_rel)
            else:
                result = '../' * depth + str(to_rel)

            return result.replace('\\', '/')

        except Exception:
            return str(to_file.relative_to(self.root_dir)).replace('\\', '/')

    def process_file(self, file_path: Path) -> bool:
        """Process a single file and fix broken links."""
        self.stats['files_scanned'] += 1

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            return False

        original_content = content
        changes_in_file = []

        # Find all markdown links
        pattern = r'\[([^\]]+)\]\(([^)]+)\)'

        def replacer(match):
            link_text = match.group(1)
            link_url = match.group(2)

            # Try to resolve broken link
            fixed_url = self.resolve_broken_link(file_path, link_url)

            if fixed_url and fixed_url != link_url:
                changes_in_file.append({
                    'original': link_url,
                    'fixed': fixed_url,
                    'text': link_text
                })
                self.stats['links_fixed'] += 1
                return f'[{link_text}]({fixed_url})'

            return match.group(0)

        content = re.sub(pattern, replacer, content)

        # Write if changed
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
            self.fixes.append({
                'file': str(file_path.relative_to(self.root_dir)),
                'changes': changes_in_file
            })
            return True

        return False

    def scan_directory(self) -> None:
        """Scan directory for markdown files with broken links."""
        print(f"{'DRY RUN - ' if self.dry_run else ''}Scanning {self.root_dir}...")
        print()

        exclude_dirs = ['node_modules', '_site', '.git']

        for md_file in self.root_dir.rglob('*.md'):
            if any(excluded in str(md_file) for excluded in exclude_dirs):
                continue

            self.process_file(md_file)

        # Print summary
        print()
        print("=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print(f"Files scanned: {self.stats['files_scanned']}")
        print(f"Files modified: {self.stats['files_modified']}")
        print(f"Links fixed: {self.stats['links_fixed']}")

        if self.fixes and self.dry_run:
            print()
            print("Sample fixes:")
            for fix in self.fixes[:10]:
                print(f"\n{fix['file']}:")
                for change in fix['changes'][:3]:
                    print(f"  [{change['text']}]")
                    print(f"    {change['original']}")
                    print(f"    -> {change['fixed']}")
                if len(fix['changes']) > 3:
                    print(f"  ... and {len(fix['changes']) - 3} more changes")

            if len(self.fixes) > 10:
                print(f"\n... and {len(self.fixes) - 10} more files")

def main():
    import argparse

    parser = argparse.ArgumentParser(description='Intelligently fix broken links')
    parser.add_argument('--run', action='store_true',
                       help='Actually fix files (default is dry-run)')
    parser.add_argument('--dir', default='.',
                       help='Root directory to scan')

    args = parser.parse_args()

    fixer = IntelligentLinkFixer(args.dir, dry_run=not args.run)
    fixer.scan_directory()

    if fixer.dry_run and fixer.stats['links_fixed'] > 0:
        print()
        print("Run with --run to apply these changes")

if __name__ == '__main__':
    main()
