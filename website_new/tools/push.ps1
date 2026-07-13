# push.ps1 — Quick push helper for the Raldamain repo
# Usage:  .\tools\push.ps1 [commit message]
# Run from: anywhere inside the repo

$REPO = Split-Path -Parent $PSScriptRoot  # website_new/
$ROOT = Split-Path -Parent $REPO          # repo root

# ── Determine commit message ───────────────────────────────────────────────────
if ($args.Count -gt 0) {
    $msg = $args -join " "
} else {
    $status = git -C $ROOT status --short
    if (-not $status) {
        Write-Host "Nothing to commit. Checking for unpushed commits..." -ForegroundColor Cyan
        $unpushed = git -C $ROOT log --oneline "@{u}..HEAD" 2>$null
        if ($unpushed) {
            Write-Host "Pushing $($unpushed.Count) unpushed commit(s):" -ForegroundColor Yellow
            $unpushed | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
            git -C $ROOT push origin (git -C $ROOT branch --show-current)
            if ($LASTEXITCODE -eq 0) { Write-Host "Pushed." -ForegroundColor Green }
            else { Write-Host "Push failed." -ForegroundColor Red }
        } else {
            Write-Host "Already up to date." -ForegroundColor Green
        }
        exit
    }
    $msg = Read-Host "Commit message"
    if (-not $msg) { Write-Host "Aborted (empty message)." -ForegroundColor Red; exit 1 }
}

# ── Show what will be committed ────────────────────────────────────────────────
Write-Host "`nChanges to commit:" -ForegroundColor Cyan
git -C $ROOT status --short

# ── Stage, commit, pull --rebase, push ────────────────────────────────────────
$branch = git -C $ROOT branch --show-current

Write-Host "`nStaging all changes..." -ForegroundColor Cyan
git -C $ROOT add -A

Write-Host "Committing: $msg" -ForegroundColor Cyan
git -C $ROOT commit -m $msg
if ($LASTEXITCODE -ne 0) { Write-Host "Commit failed." -ForegroundColor Red; exit 1 }

Write-Host "Pulling (rebase) to stay in sync..." -ForegroundColor Cyan
git -C $ROOT pull --rebase --autostash
if ($LASTEXITCODE -ne 0) { Write-Host "Rebase failed — resolve conflicts then push manually." -ForegroundColor Red; exit 1 }

Write-Host "Pushing to origin/$branch..." -ForegroundColor Cyan
git -C $ROOT push origin $branch
if ($LASTEXITCODE -eq 0) {
    Write-Host "Done. Changes pushed to origin/$branch." -ForegroundColor Green
} else {
    Write-Host "Push failed." -ForegroundColor Red
    exit 1
}
