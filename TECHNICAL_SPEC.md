# Technical Specification

**Project:** Apple Store Scraper (Cloudflare Workers)
**Reference:** [jonatw/apple-store-scrape](https://github.com/jonatw/apple-store-scrape) (Python version)
**Repository:** [jonatw/apple-store-scrape-workers](https://github.com/jonatw/apple-store-scrape-workers)

## Overview

Serverless application on Cloudflare Workers that scrapes Apple product pricing from the Apple online store across US and Taiwan, merges cross-region data, consolidates color variants, calculates TWD-based price differences, and serves the results via a responsive web frontend.

## System Requirements

- **Cloudflare Account**: Paid plan ($5/mo) — Workers, KV, R2
- **Worker limits**: 128MB memory, 15min Cron wall time, 1000 subrequests/invocation
- **Node.js**: 20+ (local development)
- **Build tool**: Vite 6 (frontend SCSS/JS compilation)

## Dependencies

| Package | Purpose |
|---------|---------|
| `wrangler` | Cloudflare Workers CLI and local dev runtime |
| `itty-router` | Lightweight HTTP router for Workers |
| `itty-cors` | CORS middleware |
| `bootstrap` | UI framework (imported via tree-shaken SCSS) |
| `@popperjs/core` | Bootstrap dependency |
| `vite` | Frontend build tool |
| `sass` | SCSS compilation for Bootstrap |
| `vitest` | Test framework |

## Region Configuration

```javascript
const REGIONS = {
  "":   ["US", "USD", "en-us", "$"],      // United States (reference region)
  "tw": ["TW", "TWD", "zh-tw", "NT$"],   // Taiwan
};
```

Each entry: `[display_name, currency_code, locale, currency_symbol]`.
Adding a region here automatically includes it in all scrapers.

## Scraping Architecture

### Dual Extraction Strategy

Implemented in `src/scraper/base.js`, ported from Python's `scraper_base.py`.

**Strategy 1 — Metrics JSON** (`extractProductsFromMetrics`):
- Parses `<script type="application/json" id="metrics">` tag
- Extracts: SKU, partNumber, name, fullPrice
- Used by: iPhone, iPad, TV/Home
- Regex: `/<script[^>]*id="metrics"[^>]*>(.*?)<\/script>/s` (flexible attribute order)

**Strategy 2 — Bootstrap JS** (`extractProductsFromBootstrap`):
- Parses `window.PRODUCT_SELECTION_BOOTSTRAP` variable via brace-balanced extraction
- Extracts: partNumber, priceKey (ConfigKey), familyType, price from displayValues/mainDisplayValues
- Used by: Mac, Watch, AirPods
- Produces `ConfigKey` field used for cross-region merging

### Model Discovery

Two patterns, both in `base.js`:

1. **Landing page links** (`discoverModels`): Scans `/shop/buy-{product}/` URLs on the main buy page. Used by iPhone, iPad, Mac.
2. **Goto-link pattern** (`discoverModelsFromGoto`): Scans `/shop/goto/` URLs on marketing pages, converting underscores to hyphens. Used by Watch, AirPods, TV/Home.

Both fall back to hardcoded `DEFAULT_*_MODELS` in `config.js` if discovery fails.

### Product-Specific Scrapers

| Scraper | File | Strategy | Post-processing |
|---------|------|----------|-----------------|
| iPhone | `iphone.js` | Metrics | None |
| iPad | `ipad.js` | Metrics | None |
| Mac | `mac.js` | Bootstrap | ConfigKey spec parsing (chip/cores/memory/storage) |
| Watch | `watch.js` | Bootstrap | Dimensions extraction (case size, material, connectivity) |
| AirPods | `airpods.js` | Bootstrap | None |
| TV/Home | `tvhome.js` | Metrics | Two-category custom fetch (Apple TV + HomePod) |

### Request Flow

```
fetchAllProducts(config)
  → discoverModels() or discoverModelsFromGoto()
  → for each model × region:
      fetchProductPage(url, regionCode, postProcess)
        → extractProductsFromMetrics(html, regionCode)
        → if empty: extractProductsFromBootstrap(html, regionCode)
        → if postProcess: postProcess(products, html)
      → 1s delay between requests (REQUEST_DELAY)
```

## Processing Pipeline

### 1. Merge (`processor/merge.js`)

Auto-selects merge strategy based on data:
- **ConfigKey merge**: When all products have a `ConfigKey` field (bootstrap-sourced products). Groups by ConfigKey to create `Price_US` + `Price_TW` columns.
- **Name merge**: When products lack ConfigKey (metrics-sourced). Groups by `Name` field.

Includes orphan detection: products appearing in only one region get `Price = 0` for the missing region with a console warning.

### 2. Color Consolidation (`processor/consolidateColors.js`)

Ported from Python's `smart_consolidate_colors.py`.

- **Color dictionary** (`KNOWN_COLORS`): 70+ color words including Apple-specific names (midnight, starlight, sky, light, cloud, mist, soft, ultramarine, etc.)
- **Ignored words** (`IGNORED_WORDS`): Product descriptors that aren't colors (gb, tb, inch, wifi, pro, air, etc.)
- **Extraction**: Multi-word colors matched first (longest match), then single-word
- **Grouping key**: `cleanedBaseName|price` (Mac uses `chip|memory|storage|price`)
- **Output**: Merged rows with `Available_Colors`, `Color_Variants`, `SKU_Variants` fields

### 3. Price Calculation (`processor/calculate.js`)

**TWD-based comparison** (matching Python version):

```
Without fee:
  Price_US_TWD = Price_US × exchangeRate
  diff% = (Price_TW - Price_US_TWD) / Price_US_TWD × 100

With fee:
  Price_US_with_fee_TWD = Price_US × (1 + feePercent/100) × exchangeRate
  diff% = (Price_TW - Price_US_with_fee_TWD) / Price_US_with_fee_TWD × 100

Recommendation (2% threshold):
  > +2%  → "US"      (Taiwan is more expensive)
  < -2%  → "TW"      (Taiwan is cheaper)
  else   → "SIMILAR"
```

## Storage

### Cloudflare KV
- Fast reads during request handling
- Keys defined in `config.js` (`KV_KEYS`): one per product type + exchange rate + lastUpdated
- Written during pipeline, read by API handlers

### Cloudflare R2
- Static JSON files served to frontend (edge-cached)
- Files: `iphone.json`, `ipad.json`, `mac.json`, `watch.json`, `airpods.json`, `tvhome.json`, `all.json`, `exchange-rate.json`
- Written simultaneously with KV during pipeline

## Frontend Architecture

### Build Pipeline
- **Source**: `frontend/` (HTML, JS, SCSS, CSS, assets)
- **Build tool**: Vite (`vite.frontend.config.js`)
- **Output**: `dist/` (served by Workers Static Assets)
- **Command**: `npm run build:frontend`

### Bootstrap Integration
- SCSS import via `frontend/scss/custom-bootstrap.scss`
- Only imports used modules: tables, forms, buttons, nav, navbar, card, badge, spinners, etc.
- Removes ~60 unused utility classes via `$utilities` map-merge
- JS: only `bootstrap/js/dist/collapse` imported (settings panel toggle)
- Build output: ~135KB CSS, ~25KB JS (gzipped: ~20KB + ~9KB)

### Client-Side Price Calculation
The frontend recalculates price differences in real time when the user changes exchange rate or transaction fee settings. This matches the Python version's approach where prices are recalculated on settings change without re-fetching data.

### Navigation
- Hash-based routing: `#iphone`, `#ipad`, `#mac`, `#watch`, `#airpods`, `#tvhome`
- Supports browser back/forward via `hashchange` event
- Dark/light theme with system preference detection and localStorage persistence

## Data Format

### Product JSON Structure
```json
{
  "metadata": {
    "lastUpdated": "2026-03-29T00:00:00.000Z",
    "exchangeRates": { "USD": 1.0, "TWD": 32.43 },
    "regions": ["US", "TW"],
    "productType": "iphone",
    "totalProducts": 21,
    "lastExchangeRateUpdate": "2026-03-29T00:00:00.000Z",
    "exchangeRateSource": "Cathay Bank"
  },
  "products": [
    {
      "SKU": "MYAP3",
      "PRODUCT_NAME": "iPhone 16 128GB",
      "Price_US": 799,
      "Price_TW": 25900,
      "Available_Colors": "Black, Pink, Ultramarine",
      "Color_Variants": 3,
      "price_difference_percent": 1.4,
      "recommendation": "SIMILAR"
    }
  ]
}
```

## CI/CD

### GitHub Actions (`deploy.yml`)

```
push to main or PR:
  job: test
    → checkout → setup Node 22 → npm ci → npm run test:quick

push to main (after test passes):
  job: deploy
    → checkout → setup Node 22 → npm ci
    → cp wrangler.example.toml wrangler.toml
    → npm run build:frontend
    → wrangler deploy
```

**Secrets:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

### Cron Scheduling
- Workers Cron trigger: `0 * * * *` (hourly at :00)
- Defined in `wrangler.toml` `[triggers]` section
- Runs the full scraping pipeline via `scheduled()` handler

## Testing

65 unit tests across 6 test files, run with Vitest.

| File | Tests | Coverage |
|------|-------|----------|
| `config.test.js` | REGIONS structure, default models, KV keys |
| `standardize.test.js` | Name normalization, Unicode, edge cases |
| `merge.test.js` | Name/ConfigKey merge, orphans, dedup |
| `calculate.test.js` | TWD-based price diff, fee calc, recommendations |
| `consolidateColors.test.js` | Color extraction, cleaning, grouping |
| `scraperBase.test.js` | SKU stripping, metrics/bootstrap extraction |

Network integration tests (`test:network`) hit live Apple pages and are skipped in CI via `SKIP_NETWORK_TESTS=1`.

## Differences from Python Version

| Aspect | Python | Workers |
|--------|--------|---------|
| Language | Python 3.13 | JavaScript (ES modules) |
| Runtime | GitHub Actions runner | Cloudflare Workers |
| Scheduling | GitHub Actions cron | Workers Cron trigger |
| Storage | CSV → JSON files on disk | KV + R2 |
| Scraper framework | `scraper_base.py` (class-based) | `scraper/base.js` (function-based) |
| Frontend hosting | GitHub Pages | Workers Static Assets |
| Merge strategy | pandas DataFrame | Plain JS arrays/objects |
| Color consolidation | pandas-based groupby | JS Map-based grouping |
| Price comparison | TWD-based, 2% threshold | TWD-based, 2% threshold (same) |
| Frontend build | Vite + SCSS | Vite + SCSS (same approach) |
| Test count | 39+ (unittest) | 65 (Vitest) |
