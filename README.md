# MORGAN Travelers — path overrides

Shared **bus route path** overrides for [MORGAN Travelers](https://github.com).  
The app **fetches** published shapes from this repo and **uploads** contribution drafts here for review.

## Layout

| Path | Purpose |
|------|---------|
| `bus-shapes.json` | **Published** routes the app loads at runtime |
| `pending/*.json` | Incoming contribution drafts (`status: pending_review`) |
| `published/bus-shapes.json` | Mirror of published file (optional backup) |
| `scripts/merge-pending.mjs` | Promote one pending file into `bus-shapes.json` |

## App configuration

In **Morgan Travelers** (Cloudflare Pages env or `.env`):

```bash
# Fetch (client — Vite)
VITE_OVERRIDES_BUS_SHAPES_URL=https://raw.githubusercontent.com/<owner>/morgan-travelers-overrides/main/bus-shapes.json

# Upload / PR (server — Pages Function)
OVERRIDES_REPO=<owner>/morgan-travelers-overrides
OVERRIDES_GITHUB_TOKEN=<fine-grained PAT with contents:write + pull_requests:write>
OVERRIDES_BASE_BRANCH=main
```

Without the remote URL, the app uses its bundled `public/overrides/bus-shapes.json`.

## Contribute flow

1. User draws/edits a path in the app → **Submit for review**
2. Pages Function `POST /api/contribute-path` validates the draft
3. If `OVERRIDES_GITHUB_TOKEN` is set, it:
   - Creates branch `contrib/<id>`
   - Writes `pending/<id>.json`
   - Opens a pull request into `main`
4. Mod reviews the PR, runs merge script (or uses the workflow), merges to `main`
5. App clients fetch updated `bus-shapes.json` (cache-busted / `no-cache`)

## Local merge (moderator)

```bash
# Preview
node scripts/merge-pending.mjs pending/kmb_e42_….json --dry-run

# Apply + write bus-shapes.json
node scripts/merge-pending.mjs pending/kmb_e42_….json
git add bus-shapes.json pending/
git commit -m "Publish path: KMB E42 …"
git push
```

Or GitHub Actions: **Actions → Merge pending contribution → Run workflow** (input = pending file path).

## Schema

Drafts use `schema: "morgan.travelers.bus-shape.v1"`.  
Published entries in `bus-shapes.json` use `"status": "published"`.

See `schema.md`.

## Create this repo on GitHub

```bash
cd morgan-travelers-overrides
git init
git add .
git commit -m "Initial overrides: bus-shapes + pending workflow"
gh repo create morgan-travelers-overrides --public --source=. --remote=origin --push
# or: git remote add origin git@github.com:<owner>/morgan-travelers-overrides.git && git push -u origin main
```
