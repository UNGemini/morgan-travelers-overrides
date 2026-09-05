# MORGAN Travelers — path overrides

Shared **bus route path** overrides for [MORGAN Travelers](https://github.com).  
The app **fetches** published shapes from this repo and **uploads** contribution drafts here for review.

## Layout

| Path | Purpose |
|------|---------|
| `bus-shapes/` | **Published** routes — one JSON file per route, plus `index.json` |
| `bus-shapes.json` | Stub pointing at `bus-shapes/index.json` (old URLs and older app builds still resolve) |
| `pending/*.json` | Incoming contribution drafts (`status: pending_review`) |
| `scripts/merge-pending.mjs` | Promote one pending file into `bus-shapes/` (+ index + stub) |
| `scripts/bus-shapes-store.mjs` | Split / assemble helpers (`split` migrates the legacy blob, `assemble` prints it back) |

Git history is the audit trail — superseded route files are deleted from `bus-shapes/` on each publish.

## App configuration

In **Morgan Travelers** (Cloudflare Pages env or `.env`):

```bash
# Fetch (client — Vite). The app also reads bus-shapes/index.json + per-route files;
# the stub keeps this legacy blob URL alive.
VITE_OVERRIDES_BUS_SHAPES_URL=https://raw.githubusercontent.com/<owner>/morgan-travelers-overrides/main/bus-shapes.json

# Upload / PR (server — Pages Function)
OVERRIDES_REPO=<owner>/morgan-travelers-overrides
OVERRIDES_GITHUB_TOKEN=<fine-grained PAT with contents:write + pull_requests:write>
OVERRIDES_BASE_BRANCH=main
```

Without the remote URL, the app uses its bundled `public/overrides/bus-shapes/` split bundle.

## Contribute flow

1. User draws/edits a path in the app → **Submit for review**
2. Pages Function `POST /api/contribute-path` validates the draft
3. If `OVERRIDES_GITHUB_TOKEN` is set, it:
   - Creates branch `contrib/<id>`
   - Writes `pending/<id>.json`
   - Opens a pull request into `main`
4. Mod reviews the PR, runs merge script (or uses the workflow), merges to `main`
5. App clients fetch `bus-shapes/index.json` + changed route files (cache-busted / `no-cache`)

## Local merge (moderator)

```bash
# Preview
node scripts/merge-pending.mjs pending/kmb_e42_….json --dry-run

# Apply → writes bus-shapes/<id>.json, index.json and the stub
node scripts/merge-pending.mjs pending/kmb_e42_….json
git add bus-shapes.json bus-shapes/ pending/
git commit -m "Publish path: KMB E42 …"
git push
```

Or GitHub Actions: **Actions → Merge pending contribution → Run workflow** (input = pending file path).

## Schema

Drafts use `schema: "morgan.travelers.bus-shape.v1"`.  
Each published file in `bus-shapes/` uses `"status": "published"`.

See `schema.md`.
