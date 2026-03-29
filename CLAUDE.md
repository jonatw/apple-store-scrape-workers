# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Apple Store Scraper Workers** is a Cloudflare Workers-based tool for scraping Apple product pricing from the Apple online store, with cross-region price comparison (US vs Taiwan). This is a reimplementation of [apple-store-scrape](https://github.com/jonatw/apple-store-scrape) (Python) on Cloudflare's serverless platform.

**Live deployment:** Cloudflare Workers (Cron: daily 00:00 UTC)

**Tech Stack:**
- **Worker:** Vanilla JavaScript on Cloudflare Workers (itty-router)
- **Storage:** Cloudflare KV (internal) + R2 (static JSON delivery)
- **Frontend:** Vanilla JavaScript + Bootstrap 5 + Vite 6
- **Testing:** Vitest (unit + optional network integration)
- **CI/CD:** GitHub Actions (test → deploy) + Workers Cron trigger

## Essential Development Commands

### Setup
```bash
npm install
cp wrangler.example.toml wrangler.toml   # Then fill in KV/R2 IDs
wrangler login
```

### Development
```bash
npm run dev              # wrangler dev (Worker on port 8787)
npm run build:frontend   # Vite build frontend → dist/
```

### Testing
```bash
npm run test             # All tests (single run)
npm run test:watch       # Watch mode
npm run test:quick       # No network tests (fast, use before/after changes)
npm run test:network     # Network integration tests only (hits apple.com)
```

### Deployment
```bash
wrangler deploy                  # Deploy Worker
wrangler secret put API_KEY      # Set production API key
```

### Testing Endpoints (local)
```
http://localhost:8787/dev-test-update     # Trigger update (no auth)
http://localhost:8787/test-kv             # Test KV storage
http://localhost:8787/test-r2             # Test R2 storage
http://localhost:8787/api/all.json        # Fetch all data
```

## Architecture Overview

### Data Pipeline Flow
```
Apple Store websites (US/TW)
  ↓ Cron trigger (daily 00:00 UTC) or POST /api/update
  ↓ 6 scrapers (iPhone, iPad, Mac, Watch, AirPods, TV/Home)
  ↓ Dual extraction: metrics script (primary) + bootstrap (fallback)
Raw product arrays
  ↓ processor/merge.js (Name-based or ConfigKey-based matching)
  ↓ processor/consolidateColors.js (merge color variants)
  ↓ processor/calculate.js (price differences + recommendations)
Final JSON with price comparisons
  ↓ storage/kv.js + storage/r2.js
KV (Worker internal) + R2 (static JSON files)
  ↓
Frontend (Cloudflare Pages) fetches directly from R2
```

### Key Files
| File | Purpose |
|------|---------|
| `src/index.js` | Worker entry point: `fetch()` and `scheduled()` handlers |
| `src/router.js` | API route definitions (itty-router) |
| `src/config.js` | Regions, default models, delays, KV keys |
| `src/updater.js` | Orchestrates full scraping pipeline |
| `src/scraper/base.js` | **Shared scraper framework** (extraction strategies, discovery, fetch) |
| `src/scraper/iphone.js` | iPhone scraper (metrics strategy) |
| `src/scraper/ipad.js` | iPad scraper (metrics strategy) |
| `src/scraper/mac.js` | Mac scraper (bootstrap + spec extraction from ConfigKey) |
| `src/scraper/watch.js` | Watch scraper (bootstrap + dimensions for size/material) |
| `src/scraper/airpods.js` | AirPods scraper (bootstrap + goto-link discovery) |
| `src/scraper/tvhome.js` | TV/HomePod scraper (two categories, custom fetch) |
| `src/scraper/exchange-rate.js` | USD/TWD rate from Cathay Bank |
| `src/processor/standardize.js` | Product name normalization |
| `src/processor/merge.js` | Cross-region merge (Name or ConfigKey strategy) |
| `src/processor/consolidateColors.js` | Color variant consolidation |
| `src/processor/calculate.js` | Price difference percentage + recommendations |
| `src/storage/kv.js` | Cloudflare KV operations |
| `src/storage/r2.js` | R2 JSON file storage |
| `src/middleware/auth.js` | API key authentication (Bearer token) |
| `src/middleware/cors.js` | CORS configuration (all origins) |
| `frontend/index.html` | SPA entry point (Bootstrap 5, 6 product tabs) |
| `frontend/js/main.js` | Data loading, DOM, settings, search, dark mode |

### Scraper Strategy

**Dual extraction** (implemented in `scraper/base.js`):
1. **Metrics** — `<script id="metrics">` JSON tag. Primary strategy for iPhone, iPad, TV/Home.
2. **Bootstrap** — `window.PRODUCT_SELECTION_BOOTSTRAP` JS variable. Fallback, and primary for Mac, Watch, AirPods.

**Merge key auto-selection** (in `processor/merge.js`):
- Products with ConfigKey (bootstrap) → merge by ConfigKey
- Products without ConfigKey (metrics) → merge by Name

### Product Categories
| Category | Scraper | Extraction | Discovery | Special |
|----------|---------|-----------|-----------|---------|
| iPhone | `iphone.js` | Metrics | Landing page links | — |
| iPad | `ipad.js` | Metrics | Landing page links | — |
| Mac | `mac.js` | Bootstrap | Landing page links | Spec extraction from ConfigKey |
| Watch | `watch.js` | Bootstrap | Goto-link pattern | Size/material from dimensions |
| AirPods | `airpods.js` | Bootstrap | Goto-link pattern | — |
| TV/Home | `tvhome.js` | Metrics | Goto-link pattern | Two categories (TV + HomePod) |

### API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/update` | API key | Trigger data update |
| GET | `/api/stats` | No | Data statistics |
| GET | `/api/all.json` | No | Combined all products + exchange rate |
| GET | `/api/iphone.json` | No | iPhone data only |
| GET | `/api/ipad.json` | No | iPad data only |
| GET | `/api/mac.json` | No | Mac data only |
| GET | `/api/watch.json` | No | Watch data only |
| GET | `/api/airpods.json` | No | AirPods data only |
| GET | `/api/tvhome.json` | No | TV/Home data only |
| GET | `/api/exchange-rate.json` | No | Exchange rate only |
| GET | `/dev-test-update` | No | Dev-only update trigger |
| GET | `*` | No | Static files from R2 |

### Region Configuration
```javascript
// src/config.js
REGIONS = {
  "": ["US", "USD", "en-us", "$"],
  "tw": ["TW", "TWD", "zh-tw", "NT$"],
};
```
To add a region: update `REGIONS` in `config.js`.

### Storage Architecture
- **KV**: Worker-internal data access (fast reads during request handling)
- **R2**: Static JSON files served to frontend (edge-cached, cost-efficient)
- Both are updated simultaneously during each pipeline run

### Exchange Rate
- Source: Cathay Bank
- Default fallback: 31.5 TWD/USD
- Refreshed with each data update

## Configuration

### wrangler.toml (not in git)
- `wrangler.example.toml` is the template — copy to `wrangler.toml` and fill in:
  - KV namespace IDs (production + preview)
  - R2 bucket names
  - API_KEY (dev only; use `wrangler secret` for production)
- Compatibility flags: `nodejs_compat`
- Cron: `0 0 * * *` (daily midnight UTC)

### Environment Variables
| Variable | Where | Description |
|----------|-------|-------------|
| `API_KEY` | `wrangler secret` / `[vars]` | Auth for POST /api/update |

## CI/CD

### GitHub Actions (`.github/workflows/deploy.yml`)
| Job | Trigger | Description |
|-----|---------|-------------|
| `test` | push/PR to main | Run `npm run test:quick` |
| `deploy` | push to main (after test passes) | `wrangler deploy` |

**Secrets required:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

**Cron scraping runs on Cloudflare Workers** (not GitHub Actions).

## Testing

### Test Files (`tests/`)
| File | Coverage |
|------|----------|
| `config.test.js` | REGIONS structure, default models, KV keys, constants |
| `standardize.test.js` | Name normalization, Unicode handling, edge cases |
| `merge.test.js` | Name/ConfigKey merge, orphan detection, deduplication |
| `calculate.test.js` | Price difference, recommendations, fee calculation |
| `consolidateColors.test.js` | Color extraction, name cleaning, grouping, consolidation |
| `scraperBase.test.js` | SKU stripping, metrics/bootstrap extraction with mock HTML |

## Frontend
- Hosted on Cloudflare Pages (separate from Worker)
- Bootstrap 5.3.3, vanilla JS, dark mode support
- **6 product tabs:** iPhone, iPad, Mac, Watch, AirPods, TV/Home
- Fetches data directly from R2 static JSON
- Mobile responsive, settings persistence via localStorage
- Environment-aware: auto-detects localhost vs production for API URLs

## AI Development Workflow

### Before making any change
1. Run the quick test suite and confirm it passes:
   ```bash
   npm run test:quick
   ```
2. Read this file to understand the area being changed.

### When modifying scrapers
- **Edit `scraper/base.js`** for shared extraction/discovery logic. Do NOT duplicate logic in individual scrapers.
- Apple Store HTML structure changes frequently — verify selectors against live pages.
- Maintain the 1-second rate limiting (`REQUEST_DELAY`) between requests.
- Bootstrap data structures vary between product types — check `displayValues` vs `mainDisplayValues`, `partNumber` vs `btrOrFdPartNumber`, `priceKey` vs `fullPrice`.
- Watch for Unicode whitespace issues (U+00A0) in cross-region Name comparisons.
- Test with `http://localhost:8787/dev-test-update` after scraper changes.

### When modifying processors
- `merge.js` auto-selects merge key (ConfigKey vs Name) — changes affect all product types.
- `consolidateColors.js` groups by cleaned name + price — changes affect display output.
- `calculate.js` computes price difference percentages using exchange rate.

### When modifying the frontend
- Test with both light and dark themes.
- Verify mobile responsiveness (6 tabs should not overflow on mobile).
- Frontend reads from R2 static JSON — ensure data format changes are reflected in both Worker output and frontend parsing.

### After making changes
1. Run quick tests again and confirm all pass.
2. If any test fails, fix the production code first. Do not modify tests without user approval.
3. Run `npm run build:frontend` to verify the frontend builds.

### When uncertain
- Do not guess at Apple Store HTML structure — check the live page first.
- Do not hardcode product URLs or model lists — the scraper discovers models dynamically.
- `wrangler.toml` contains secrets — never commit it (it's in `.gitignore`).
