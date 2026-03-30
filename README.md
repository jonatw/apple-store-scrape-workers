# Apple Store Scraper (Cloudflare Workers)

Scrapes Apple product prices across regions (US / Taiwan), consolidates color variants, and serves a responsive comparison website. Helps you decide where to buy Apple products before traveling.

This is a **Cloudflare Workers reimplementation** of [apple-store-scrape](https://github.com/jonatw/apple-store-scrape) (Python version), providing serverless execution, edge-cached delivery, and zero-maintenance hosting.

**Live site:** [apple.av8r.tw](https://apple.av8r.tw) (hourly auto-update)

## Features

- **6 product categories**: iPhone, iPad, Mac, Apple Watch, AirPods, TV & HomePod
- **Dual extraction strategy**: metrics JSON (primary) + bootstrap JS (fallback)
- **Dynamic model discovery**: auto-detects available products from Apple's website
- **TWD-based price comparison**: converts USD to TWD, calculates % difference with optional credit card fee
- **Smart color consolidation**: merges color variants into single product rows
- **Responsive web interface**: dark mode, search, mobile-friendly, collapsible settings
- **Hourly automatic updates**: Cloudflare Workers Cron trigger (not GitHub Actions)
- **Static JSON delivery**: R2 edge-cached for fast frontend loading
- **Tree-shaken Bootstrap**: Vite + SCSS build, only includes used components

## Architecture

```
Apple Store websites (US / TW)
  |  Cron trigger (hourly) or POST /api/update
  v
6 scrapers (iPhone, iPad, Mac, Watch, AirPods, TV/Home)
  |  Dual extraction: metrics script → bootstrap fallback
  v
Raw product arrays per region
  |  processor/merge.js      — cross-region merge (Name or ConfigKey)
  |  processor/consolidateColors.js — merge color variants
  |  processor/calculate.js  — TWD-based price difference + recommendations
  v
Final JSON with price comparisons
  |  storage/kv.js + storage/r2.js
  v
KV (Worker internal) + R2 (static JSON)
  |
  v
Frontend (served from dist/ via Workers Static Assets)
```

## Comparison with Python Version

| Feature | [Python version](https://github.com/jonatw/apple-store-scrape) | This Workers version |
|---------|--------------------------------------------------------------|---------------------|
| Runtime | Python 3.13 + GitHub Actions | Cloudflare Workers (JS) |
| Scheduling | GitHub Actions cron | Workers Cron trigger |
| Storage | CSV files + JSON on disk | Cloudflare KV + R2 |
| Hosting | GitHub Pages | Workers Static Assets |
| Frontend build | Vite + SCSS | Vite + SCSS (same approach) |
| Scraper framework | `scraper_base.py` | `scraper/base.js` |
| Color consolidation | `smart_consolidate_colors.py` | `processor/consolidateColors.js` |
| Price comparison | TWD-based, 2% threshold | TWD-based, 2% threshold |
| Test framework | unittest (39+ tests) | Vitest (65 tests) |

## Quick Start

### Prerequisites

- Node.js 20+
- Cloudflare account (paid plan, $5/mo for Workers + KV + R2)

### Setup

```bash
git clone https://github.com/jonatw/apple-store-scrape-workers.git
cd apple-store-scrape-workers
npm install
cp wrangler.example.toml wrangler.toml   # Fill in KV/R2 IDs
wrangler login
```

### Development

```bash
npm run build:frontend   # Vite build → dist/ (required before dev)
npm run dev              # wrangler dev (Worker on port 8787)
```

Then open `http://localhost:8787` and trigger a data update at `http://localhost:8787/dev-test-update`.

### Testing

```bash
npm run test:quick       # Unit tests only (no network, fast)
npm run test             # All tests
npm run test:watch       # Watch mode
npm run test:network     # Network integration tests (hits apple.com)
```

### Deployment

```bash
wrangler secret put API_KEY   # Set production API key
wrangler deploy               # Deploy Worker
```

GitHub Actions automatically runs tests and deploys on push to `main`.

**Required GitHub Secrets:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

**Optional GitHub Secret:** `VITE_GTM_ID` — see [Analytics](#analytics-optional) section.

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/all.json` | No | All products + exchange rate |
| GET | `/api/iphone.json` | No | iPhone data |
| GET | `/api/ipad.json` | No | iPad data |
| GET | `/api/mac.json` | No | Mac data |
| GET | `/api/watch.json` | No | Watch data |
| GET | `/api/airpods.json` | No | AirPods data |
| GET | `/api/tvhome.json` | No | TV & Home data |
| GET | `/api/exchange-rate.json` | No | Exchange rate |
| GET | `/api/stats` | No | Data statistics |
| POST | `/api/update` | API key | Trigger data update |
| GET | `/dev-test-update` | No | Dev-only update trigger |

## Project Structure

```
src/
  index.js                    # Worker entry: fetch() + scheduled() handlers
  router.js                   # API route definitions (itty-router)
  config.js                   # Regions, default models, delays, KV keys
  updater.js                  # Pipeline orchestrator
  scraper/
    base.js                   # Shared scraper framework (extraction, discovery, fetch)
    iphone.js                 # iPhone scraper (metrics)
    ipad.js                   # iPad scraper (metrics)
    mac.js                    # Mac scraper (bootstrap + spec extraction)
    watch.js                  # Watch scraper (bootstrap + dimensions)
    airpods.js                # AirPods scraper (bootstrap + goto-link)
    tvhome.js                 # TV/HomePod scraper (metrics, two categories)
    exchange-rate.js           # USD/TWD rate from Cathay Bank
  processor/
    standardize.js            # Product name normalization
    merge.js                  # Cross-region merge (Name or ConfigKey)
    consolidateColors.js      # Color variant consolidation
    calculate.js              # TWD-based price difference + recommendations
  storage/
    kv.js                     # Cloudflare KV operations
    r2.js                     # R2 JSON file storage
  middleware/                  # Auth, CORS, error handling
  handlers/                    # API request handlers
  services/                    # Data service layer
frontend/
  index.html                  # SPA entry point
  main.js                     # Vite entry: SCSS + Bootstrap JS + app code
  scss/custom-bootstrap.scss  # Tree-shaken Bootstrap (only used modules)
  css/styles.css              # App-specific styles
  assets/                     # favicon, logo, robots.txt, sitemap.xml
tests/                        # Vitest unit tests (65 tests)
dist/                         # Vite build output (served by Worker)
vite.frontend.config.js       # Vite config for frontend build
wrangler.example.toml         # Wrangler config template
.github/workflows/deploy.yml  # CI/CD: test → build → deploy
```

## Configuration

### wrangler.toml

Copy `wrangler.example.toml` to `wrangler.toml` and fill in:

- KV namespace IDs (production + preview): `wrangler kv namespace create APPLE_STORE_DATA`
- R2 bucket names: `wrangler r2 bucket create apple-store-data`
- API_KEY for local dev only (use `wrangler secret` for production)

### Adding a Region

Update `REGIONS` in `src/config.js`:

```javascript
REGIONS = {
  "":   ["US", "USD", "en-us", "$"],
  "tw": ["TW", "TWD", "zh-tw", "NT$"],
  "jp": ["JP", "JPY", "ja", "¥"],    // Add new region
};
```

All scrapers will automatically include the new region.

## Price Comparison Logic

Prices are compared in **TWD** (New Taiwan Dollar):

1. Convert US price to TWD: `US_Price × (1 + card_fee%) × exchange_rate`
2. Difference: `(TW_Price - US_TWD) / US_TWD × 100%`
3. Recommendation (2% threshold):
   - `> +2%` → "Buy in US" (Taiwan is more expensive)
   - `< -2%` → "Buy in Taiwan" (Taiwan is cheaper)
   - Otherwise → "Similar"

## SEO & Analytics

### Crawlability
- `robots.txt` — allows all crawlers, points to sitemap
- `sitemap.xml` — lists all 7 product category URLs with hourly `changefreq`
- Open Graph + Twitter Card meta tags for social sharing
- JSON-LD `WebApplication` schema for AI crawlers (ChatGPT, Perplexity, Google AI Overview)
- `/api/*.json` endpoints return clean JSON, directly consumable by AI agents

### Analytics (optional)
Google Tag Manager is injected at build time via `VITE_GTM_ID` environment variable. This keeps tracking code out of the open-source codebase — forks deploy without any analytics unless they configure their own.

To enable:
1. Set GitHub Secret `VITE_GTM_ID` = your GTM container ID (e.g. `GTM-XXXXXXXX`)
2. Configure GA4 inside GTM (Tag → GA4 Configuration → Measurement ID → All Pages trigger)
3. CI build injects GTM with deferred loading (zero PageSpeed impact)

### Cloudflare AI Bot Settings
Cloudflare may inject `Content-Signal` directives and AI bot blocks into `robots.txt`. To allow AI crawlers:
1. Cloudflare Dashboard → `your-domain` → **Security** → **Bots** → **AI Scrapers and Crawlers**
2. Allow the bots you want (GPTBot, ClaudeBot, Google-Extended, etc.)

## License

MIT

This project is for personal research and price comparison. Not affiliated with Apple Inc. Apple product names are the property of their respective owners. Scrapers include 1-second delays between requests to respect Apple's servers.

## Reference

- **Python version**: [jonatw/apple-store-scrape](https://github.com/jonatw/apple-store-scrape) — the original implementation this project is based on
- **Cloudflare Workers docs**: [developers.cloudflare.com/workers](https://developers.cloudflare.com/workers/)
