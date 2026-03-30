# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Apple Store Scraper Workers** is a Cloudflare Workers reimplementation of [apple-store-scrape](https://github.com/jonatw/apple-store-scrape) (Python). It scrapes Apple product pricing from the Apple online store across regions (US / Taiwan), consolidates color variants, calculates TWD-based price differences, and serves a responsive comparison website.

- **GitHub:** [jonatw/apple-store-scrape-workers](https://github.com/jonatw/apple-store-scrape-workers)
- **Reference project:** [jonatw/apple-store-scrape](https://github.com/jonatw/apple-store-scrape) (Python version)
- **Live site:** [apple.av8r.tw](https://apple.av8r.tw) (hourly auto-update)
- **Deployment:** Cloudflare Workers + Custom Domain

**Tech Stack:**
- **Worker:** Vanilla JavaScript on Cloudflare Workers (itty-router)
- **Storage:** Cloudflare KV (internal) + R2 (static JSON delivery)
- **Frontend:** Vanilla JavaScript + Bootstrap 5 (tree-shaken via SCSS) + Vite 6
- **Testing:** Vitest (unit + optional network integration)
- **CI/CD:** GitHub Actions (test → build → deploy) + Workers Cron trigger

## Essential Development Commands

### Setup
```bash
npm install
cp wrangler.example.toml wrangler.toml   # Then fill in KV/R2 IDs
wrangler login
```

### Development
```bash
npm run build:frontend   # Vite build frontend → dist/ (required before dev)
npm run dev              # wrangler dev (Worker on port 8787, serves from dist/)
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
  ↓ Cron trigger (hourly) or POST /api/update
  ↓ 6 scrapers (iPhone, iPad, Mac, Watch, AirPods, TV/Home)
  ↓ Dual extraction: metrics script (primary) + bootstrap (fallback)
Raw product arrays
  ↓ processor/merge.js (Name-based or ConfigKey-based matching)
  ↓ processor/consolidateColors.js (merge color variants)
  ↓ processor/calculate.js (TWD-based price differences + recommendations)
Final JSON with price comparisons
  ↓ storage/kv.js + storage/r2.js
KV (Worker internal) + R2 (static JSON files)
  ↓
Frontend (served from dist/ via Workers Static Assets)
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
| `src/processor/calculate.js` | TWD-based price difference + recommendations |
| `src/storage/kv.js` | Cloudflare KV operations |
| `src/storage/r2.js` | R2 JSON file storage |
| `src/middleware/auth.js` | API key authentication (Bearer token) |
| `src/middleware/cors.js` | CORS configuration (all origins) |
| `frontend/index.html` | SPA entry point (6 product tabs) |
| `frontend/main.js` | Vite entry: imports SCSS + Bootstrap JS + app code |
| `frontend/scss/custom-bootstrap.scss` | Tree-shaken Bootstrap SCSS (only used modules) |
| `frontend/css/styles.css` | App-specific styles (price colors, theme toggle) |
| `vite.frontend.config.js` | Vite config for frontend build → `dist/` (includes GTM injection plugin) |
| `frontend/assets/robots.txt` | Crawl rules + sitemap pointer (Cloudflare may append AI bot directives) |
| `frontend/assets/sitemap.xml` | All product category URLs for search engines |

### Scraper Strategy

**Dual extraction** (implemented in `scraper/base.js`):
1. **Metrics** — `<script id="metrics">` JSON tag. Primary strategy for iPhone, iPad, TV/Home.
2. **Bootstrap** — `window.PRODUCT_SELECTION_BOOTSTRAP` JS variable. Fallback, and primary for Mac, Watch, AirPods.

**Merge key auto-selection** (in `processor/merge.js`):
- Products with ConfigKey (bootstrap) → merge by ConfigKey
- Products without ConfigKey (metrics) → merge by Name

### Price Comparison Logic

Prices are compared in **TWD** (New Taiwan Dollar), not USD:
1. Convert US price to TWD: `US_Price × (1 + card_fee%) × exchange_rate`
2. Difference: `(TW_Price - US_TWD) / US_TWD × 100%`
3. Recommendation (2% threshold):
   - `> +2%` → "Buy in US" (Taiwan is more expensive)
   - `< -2%` → "Buy in Taiwan" (Taiwan is cheaper)
   - Otherwise → "Similar"

This matches the Python reference project's calculation logic.

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
| GET | `*` | No | Static files from dist/ |

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

### Frontend Build
- **Source**: `frontend/` (HTML, JS, SCSS, CSS)
- **Build**: `npm run build:frontend` → Vite compiles SCSS, tree-shakes Bootstrap, bundles JS → `dist/`
- **Serve**: Workers Static Assets serves `dist/` directory
- Bootstrap is imported via SCSS (`frontend/scss/custom-bootstrap.scss`), only including used modules
- Bootstrap JS: only `collapse` component is imported (for settings panel)

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
- Cron: `0 * * * *` (hourly at :00)
- Assets: `directory = "./dist"` (Vite build output)

### Environment Variables
| Variable | Where | Description |
|----------|-------|-------------|
| `API_KEY` | `wrangler secret` / `[vars]` | Auth for POST /api/update |

## CI/CD

### GitHub Actions (`.github/workflows/deploy.yml`)
| Job | Trigger | Description |
|-----|---------|-------------|
| `test` | push/PR to main | Run `npm run test:quick` |
| `deploy` | push to main (after test passes) | `npm run build:frontend` → `wrangler deploy` |

**Secrets required:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

**Cron scraping runs on Cloudflare Workers** (not GitHub Actions).

## Testing

### Test Files (`tests/`)
| File | Coverage |
|------|----------|
| `config.test.js` | REGIONS structure, default models, KV keys, constants |
| `standardize.test.js` | Name normalization, Unicode handling, edge cases |
| `merge.test.js` | Name/ConfigKey merge, orphan detection, deduplication |
| `calculate.test.js` | TWD-based price difference, recommendations, fee calculation |
| `consolidateColors.test.js` | Color extraction, name cleaning, grouping, consolidation |
| `scraperBase.test.js` | SKU stripping, metrics/bootstrap extraction with mock HTML |

## Frontend
- Served via Workers Static Assets from `dist/` (Vite build output)
- Bootstrap 5.3 imported via tree-shaken SCSS (only used modules)
- Vanilla JS, dark mode support, system theme detection
- **6 product tabs:** iPhone, iPad, Mac, Watch, AirPods, TV/Home
- Hash-based navigation (#iphone, #ipad, etc.) with back/forward support
- Collapsible settings panel (exchange rate, transaction fee)
- Mobile responsive (Product/US/TW/Diff columns; US+Fee and Rec. hidden on mobile)
- TWD-based price comparison calculated client-side in real time

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
- The metrics `<script>` tag attribute order varies — use flexible regex: `/<script[^>]*id="metrics"[^>]*>/`.
- Test with `http://localhost:8787/dev-test-update` after scraper changes.

### When modifying processors
- `merge.js` auto-selects merge key (ConfigKey vs Name) — changes affect all product types.
- `consolidateColors.js` groups by cleaned name + price — changes affect display output. New Apple colors must be added to `KNOWN_COLORS`.
- `calculate.js` computes TWD-based price difference using exchange rate. Threshold is 2%.

### When modifying the frontend
- Source is in `frontend/`, build output in `dist/`. Run `npm run build:frontend` after changes.
- Test with both light and dark themes.
- Verify mobile responsiveness (6 tabs should not overflow on mobile).
- Frontend reads from `/api/*.json` — ensure data format changes are reflected in both Worker output and frontend parsing.
- Bootstrap is imported via SCSS — add new Bootstrap components to `frontend/scss/custom-bootstrap.scss` if needed.

### After making changes
1. Run quick tests again and confirm all pass.
2. If any test fails, fix the production code first. Do not modify tests without user approval.
3. Run `npm run build:frontend` to verify the frontend builds.

### When uncertain
- Do not guess at Apple Store HTML structure — check the live page first.
- Do not hardcode product URLs or model lists — the scraper discovers models dynamically.
- `wrangler.toml` contains secrets — never commit it (it's in `.gitignore`).
- When in doubt about behavior, refer to the Python reference project: [apple-store-scrape](https://github.com/jonatw/apple-store-scrape).
