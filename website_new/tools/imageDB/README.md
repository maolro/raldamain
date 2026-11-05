# imageDB

A tiny local gallery/tagger for `assets/images/`. Runs as a small web app on your
own machine — nothing leaves your computer.

## Setup (once)

```
pip install -r imageDB/requirements.txt
```

(Already satisfied in this environment — flask and pillow are both installed.)

## Run

```
python imageDB/app.py
```

or just double-click `imageDB/run.bat` on Windows. It opens `http://127.0.0.1:5050/`
in your browser automatically. Use `--port 6000` to change the port, `--no-browser`
to skip auto-opening a tab.

On every start it **rescans `assets/images/`** and catalogs any file that isn't in
the database yet — so images you drop straight into the folder structure outside
the app still show up. You can also trigger this manually with the "Rescan
folders" button.

## What it does

- **Browse & search** every image in `assets/images/`, with live filtering by
  free-text search, category, faction, and clickable tags. Picking a category
  narrows the tag bar to tags used in that category and clears selected tags.
- **Tokenize** any image from its detail view: crops it to a circle with a tan
  rim and transparent background (PNG, 280 px by default, for Roll20) and files
  it under the `tokens` category with the same subject, faction and tags.
- **Add images** via drag-and-drop or file picker, tagging each one (subject,
  display name, category, faction, an optional "variant" label for things like
  `young` / `coronation` / `elder`, free-form tags, notes) before it's saved.
- **Multiple images per subject ("variants")**: every image belongs to a
  `(category, subject)` group. One image per group is flagged `is_main` — the
  one you'd use as the default portrait — and you can re-pick it from the
  variant strip in the detail view at any time. Cards in the grid show a
  "★ main" badge and a "N variants" count so you always know where you stand.
- **Copy to clipboard**: each card (and the detail modal) has a one-click
  "copy image" button that puts the actual image bytes on your clipboard,
  ready to paste into Discord, Obsidian, Word, etc. — and a "copy path"
  button for the absolute file path, plus a "copy relative path" option
  (relative to `assets/images/`, handy for `![[...]]`-style wiki embeds).
- **Open in Explorer**: jumps straight to the file, selected, in Windows
  Explorer.

## How images are stored

Uploading through the app saves the file to
`assets/images/<category>/<faction>/<subject>[__<variant>].<ext>` — matching
the folder convention already in use — and records everything else (tags,
display name, which one is "main", notes) in `assets/imagedb.json`, a plain
JSON file that's safe to read, back up, or hand-edit.

**Metadata is decoupled from the filename after creation.** Renaming the
"subject" or "display name" in the edit panel does *not* rename the file on
disk — it only updates the catalog entry. That keeps things safe (no risk of
breaking a link elsewhere) but means the filename on disk can drift from the
current display name over time; that's expected and fine.

Thumbnails are cached in `assets/.imagedb_thumbs/` (gitignored, regenerated
automatically — safe to delete anytime).

## Deleting

Deleting an entry always removes it from the catalog. You're asked separately
whether to also delete the underlying file — that's permanent (no recycle bin
involved), so it's a second, explicit confirmation.
