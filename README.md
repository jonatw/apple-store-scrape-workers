# Apple Store Scraper (Cloudflare Workers)

Scrapes Apple product prices across regions (US/Taiwan), consolidates color variants, and serves a responsive comparison website. Reimplementation of [apple-store-scrape](https://github.com/jonatw/apple-store-scrape) (Python) on Cloudflare Workers.

## Features

- **6 product categories:** iPhone, iPad, Mac, Watch, AirPods, TV/Home
- Dual extraction strategy (metrics JSON + bootstrap JS)
- Dynamic model discovery from Apple landing pages
- Cross-region price comparison with exchange rate
- Color variant consolidation
- Responsive web interface with dark mode
- Daily automatic updates via Workers Cron trigger
- Static JSON delivery via R2 (edge-cached)

## Architecture

```
Cron (daily) or POST /api/update
  → 6 scrapers (metrics + bootstrap extraction)
  → merge (Name or ConfigKey matching)
  → consolidate colors
  → calculate price differences
  → store to KV + R2
  → Frontend fetches from R2
```

## Quick Start

```bash
npm install
cp wrangler.example.toml wrangler.toml  # Fill in KV/R2 IDs
wrangler login
npm run dev                              # http://localhost:8787
```

Trigger a data update: `http://localhost:8787/dev-test-update`

## Testing

```bash
npm run test:quick    # Unit tests (no network, fast)
npm run test          # All tests
npm run test:network  # Network integration tests (hits apple.com)
```

## Deployment

```bash
wrangler secret put API_KEY   # Set production API key
wrangler deploy               # Deploy Worker
```

Or push to `main` — GitHub Actions runs tests, then deploys automatically.

**Required GitHub Secrets:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/all.json` | All products + exchange rate |
| GET | `/api/iphone.json` | iPhone data |
| GET | `/api/ipad.json` | iPad data |
| GET | `/api/mac.json` | Mac data |
| GET | `/api/watch.json` | Watch data |
| GET | `/api/airpods.json` | AirPods data |
| GET | `/api/tvhome.json` | TV/Home data |
| GET | `/api/exchange-rate.json` | Exchange rate |
| POST | `/api/update` | Trigger update (requires API key) |

## Project Structure

```
src/
├── index.js              # Worker entry (fetch + scheduled handlers)
├── router.js             # API routes
├── config.js             # Regions, models, constants
├── updater.js            # Pipeline orchestrator
├── scraper/
│   ├── base.js           # Shared framework (extraction, discovery)
│   ├── iphone.js         # iPhone scraper
│   ├── ipad.js           # iPad scraper
│   ├── mac.js            # Mac scraper (spec extraction)
│   ├── watch.js          # Watch scraper (dimensions)
│   ├── airpods.js        # AirPods scraper
│   ├── tvhome.js         # TV/HomePod scraper
│   └── exchange-rate.js  # USD/TWD rate
├── processor/
│   ├── standardize.js    # Name normalization
│   ├── merge.js          # Cross-region merge
│   ├── consolidateColors.js  # Color variant consolidation
│   └── calculate.js      # Price differences
├── storage/
│   ├── kv.js             # Cloudflare KV
│   └── r2.js             # Cloudflare R2
├── middleware/            # CORS, auth, error handling
├── handlers/             # API request handlers
├── services/             # Data service
└── utils/                # Logger, errors, MIME

frontend/                 # Static site (Cloudflare Pages)
tests/                    # Vitest unit tests
.github/workflows/        # CI/CD (test → deploy)
```

## Configuration

Copy `wrangler.example.toml` to `wrangler.toml` and fill in:
- KV namespace IDs (production + preview)
- R2 bucket names
- API_KEY (dev only; use `wrangler secret` for production)

## License

Not affiliated with Apple Inc. All product names are property of their respective owners.
