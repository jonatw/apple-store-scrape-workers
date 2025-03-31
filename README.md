# Apple Store Scraper (Cloudflare Workers)

Apple Store Scraper is a Cloudflare Workers-based tool for scraping iPhone and iPad product pricing information from the Apple online store. This project is a reimplementation of [the original Python-based Apple Store Scraper](https://github.com/jonatw/apple-store-scrape) using Cloudflare Workers, providing improved performance, reliability, and global distribution.

## Features

- Scrapes the latest iPhone and iPad product information from Apple's online store
- Runs on Cloudflare Workers for global distribution and reliability
- Automatically updates data using Cron triggers
- Stores data in Cloudflare KV for fast retrieval
- Provides JSON API endpoints for data access
- Includes a responsive web interface with dark mode support hosted on Cloudflare Pages
- Supports multi-region price comparison (currently US and Taiwan)
- Calculates price differences with customizable exchange rates
- Features interactive settings and search functionality

## Architecture

This project uses a serverless architecture based on Cloudflare Workers, R2, and Pages:

- **Worker**: JavaScript running on Cloudflare Workers for data scraping and processing
- **Data Storage**: Dual storage approach using both Cloudflare KV and R2
- **Data Delivery**: Static JSON files served directly from R2 bucket
- **Frontend**: Static site hosted on Cloudflare Pages, fetching data directly from R2
- **Scheduled Updates**: Cron triggers for daily data updates
- **Admin API**: Secure endpoint for manual data updates

## Requirements

- Node.js 14.x or higher
- Wrangler CLI v3 or higher (`npm install -g wrangler`)
- Cloudflare account with Workers enabled
- Cloudflare Pages for frontend hosting

## Installation

1. Clone this repository:
```bash
git clone https://github.com/jonatw/apple-store-scrape-workers.git
cd apple-store-scrape-workers
```

2. Install dependencies:
```bash
npm install
```

3. Configure Wrangler:
```bash
wrangler login
```

4. Create KV namespaces:
```bash
# Main environment
wrangler kv namespace create APPLE_STORE_DATA

# Preview environment
wrangler kv namespace create APPLE_STORE_DATA --preview
```

5. Configure your Wrangler settings:
```bash
# Copy example configuration file
cp wrangler.example.toml wrangler.toml
```

6. Edit your `wrangler.toml` file to include your KV namespace IDs and other configuration settings.

## Environment Variables and Secrets

This project follows best practices for handling sensitive data in Cloudflare Workers:

1. **Environment Variables**:
   - Set non-sensitive variables in the `[vars]` section of your `wrangler.toml` file:
     ```toml
     [vars]
     CUSTOM_DOMAIN = "appc.example.com"
     ```
   - These variables will be available in your Worker code through the `env` parameter.

2. **Secrets (API Keys, Tokens, etc.)**:
   - For development, you can temporarily set secrets in your `wrangler.toml`:
     ```toml
     [vars]
     API_KEY = "your-dev-api-key"
     ```
   - Or pass them via command line (preferred for development):
     ```bash
     wrangler dev --var API_KEY=your-dev-api-key
     ```
   - For production, use Wrangler secrets:
     ```bash
     wrangler secret put API_KEY
     ```
   - This stores the secret securely in Cloudflare, not in your code.

3. **Environment-Specific Variables**:
   - You can set different variables for different environments:
     ```toml
     [env.dev.vars]
     API_HOST = "dev-api.example.com"
     
     [env.production.vars]
     API_HOST = "api.example.com"
     ```

4. **Configuration Best Practices**: 
   - `wrangler.example.toml` is a template with placeholders
   - `wrangler.toml` is in `.gitignore` to prevent committing sensitive data
   - Never commit secrets or API keys to your repository

## Local Development and Testing

This section details how to develop and test both the Worker API and Cloudflare Pages frontend locally.

### Prerequisites

1. Ensure you have the latest version of Wrangler CLI installed:
   ```bash
   npm install -g wrangler
   ```

2. Install project dependencies:
   ```bash
   npm install
   ```

3. Make sure your `wrangler.toml` is correctly configured, especially the KV namespace settings:
   ```toml
   # Local development configuration
   [dev]
   port = 8787  # Worker API will run on this port
   ```

### Running the Worker API Locally

1. Start the Worker API local development server:
   ```bash
   wrangler dev
   ```

2. This will start the Worker API at http://localhost:8787
   - You can test the API by visiting http://localhost:8787/api/all in your browser
   - You can also use tools like curl or Postman to test the API endpoints

### Running the Frontend Locally

There are several ways to run the frontend locally:

#### Method 1: Using a Static File Server

1. Install a simple static file server like `serve`:
   ```bash
   npm install -g serve
   ```

2. In another terminal window, navigate to the frontend directory and start the server:
   ```bash
   serve frontend -p 3000
   ```

3. The frontend will be accessible at http://localhost:3000

#### Method 2: Using Vite Development Server

1. Add the following script to your `package.json`:
   ```json
   "scripts": {
     "dev:frontend": "vite frontend --port 3000"
   }
   ```

2. Install Vite:
   ```bash
   npm install -D vite
   ```

3. Start the frontend development server in another terminal window:
   ```bash
   npm run dev:frontend
   ```

4. The frontend will be accessible at http://localhost:3000 with hot reload functionality

#### Method 3: Using Cloudflare Pages Preview

If you've already connected your project to Cloudflare Pages:

1. Use Wrangler to preview Pages:
   ```bash
   wrangler pages dev frontend --port 3000
   ```

2. This will start the Pages preview at http://localhost:3000

### Connecting the Frontend to the Local API

When running the Worker API and frontend on different ports, you need to make some adjustments to handle cross-origin requests:

1. Ensure CORS is correctly configured in the Worker API to allow requests from the frontend domain:
   ```javascript
   // In cors.js
   export const { preflight, corsify } = createCors({
     origins: ['http://localhost:3000'],  // Allow frontend domain
     methods: ['GET', 'OPTIONS'],
   });
   ```

2. In the frontend JavaScript, specify the full API URL:
   ```javascript
   // In main.js
   const API_BASE_URL = 'http://localhost:8787';

   // Fetch data from API
   const response = await fetch(`${API_BASE_URL}/api/all`);
   ```

### Running API and Frontend Simultaneously

For convenience during development, you can use `concurrently` to run both the API and frontend at the same time:

1. Install concurrently:
   ```bash
   npm install -D concurrently
   ```

2. Add the following script to your `package.json`:
   ```json
   "scripts": {
     "dev:worker": "wrangler dev",
     "dev:frontend": "serve frontend -p 3000",
     "dev": "concurrently \"npm run dev:worker\" \"npm run dev:frontend\""
   }
   ```

3. Start both services with a single command:
   ```bash
   npm run dev
   ```

### Testing API Endpoints

1. Test fetching all data:
   ```
   http://localhost:8787/api/all
   ```

2. Test individual API endpoints:
   ```
   http://localhost:8787/api/iphone
   http://localhost:8787/api/ipad
   http://localhost:8787/api/exchange-rate
   ```

3. Test the update functionality (requires API key):
   ```bash
   curl -X POST http://localhost:8787/api/update \
     -H "Authorization: Bearer your-api-key"
   ```

4. Development test endpoint (no authentication required):
   ```
   http://localhost:8787/dev-test-update
   ```

### Troubleshooting Common Issues

1. **CORS Errors**:
   - Ensure the CORS middleware in the Worker API allows the frontend domain
   - Check if the request is using the correct protocol (http/https)

2. **API Connection Issues**:
   - Confirm the Worker API is running and accessible
   - Verify the API endpoint URL is correct
   - Check for any network request errors (using browser developer tools)

3. **KV Storage Issues**:
   - Ensure local KV namespaces are set up
   - Check the KV binding configuration in `wrangler.toml`

4. **Data Not Displaying**:
   - Check if the JSON structure returned by the API matches what the frontend expects
   - Look for errors in the JavaScript console
   - Verify DOM selectors are correct

5. **Static Asset Loading Failures**:
   - Confirm file paths and references are correct
   - Check for 404 errors in network requests

### Production Environment Testing

Before deploying changes to production, it's recommended to test in a preview environment:

1. Create a Worker preview deployment:
   ```bash
   wrangler deploy --env preview
   ```

2. Use Cloudflare Pages preview functionality:
   - Create a feature branch on GitHub
   - Cloudflare Pages will automatically create a preview deployment for that branch
   - Test the complete functionality using the preview URL

## Deployment

### Deploying the Worker API

Deploy your Worker to Cloudflare:

```bash
wrangler deploy
```

Make sure you've set up your secrets in production first:
```bash
wrangler secret put API_KEY
```

### Deploying the Frontend to Cloudflare Pages

1. Connect your GitHub repository to Cloudflare Pages in the Cloudflare Dashboard
2. Configure the build settings:
   - Build command: (if needed)
   - Build output directory: `frontend`
3. Deploy the site

## API Endpoints

The Worker provides the following API endpoints:

### Data Endpoints

- `GET /api/iphone`: Returns iPhone product data
- `GET /api/ipad`: Returns iPad product data
- `GET /api/exchange-rate`: Returns current exchange rate data
- `GET /api/all`: Returns all data (iPhone, iPad, and exchange rates) in a single response

### Admin Endpoints

- `POST /api/update`: Triggers a data update (requires API key)

Example API key usage for manual updates:

```bash
curl -X POST https://your-worker.your-subdomain.workers.dev/api/update \
  -H "Authorization: Bearer your-api-key"
```

### Development Test Endpoint

For development purposes, there's a special endpoint to trigger data updates without authentication:

- `GET /dev-test-update`: Triggers a data update without requiring authentication (for development only)

## Project Structure

```
apple-store-scrape-workers/
│
├── src/                        # Worker API source code
│   ├── index.js                # Main Worker entry point
│   ├── router.js               # API routes
│   ├── config.js               # Configuration settings
│   ├── handlers/               # API request handlers
│   │   ├── index.js            # Handler exports
│   │   ├── apiHandler.js       # API endpoint handlers
│   │   └── devHandler.js       # Development test handlers
│   ├── middleware/             # Middleware
│   │   ├── cors.js             # CORS middleware
│   │   ├── auth.js             # Authentication middleware
│   │   └── errorHandler.js     # Error handling middleware
│   ├── scraper/                # Web scraping modules
│   │   ├── iphone.js           # iPhone scraper
│   │   ├── ipad.js             # iPad scraper
│   │   └── exchange-rate.js    # Exchange rate fetcher
│   ├── processor/              # Data processing modules
│   │   ├── standardize.js      # Name standardization
│   │   ├── merge.js            # Region data merging
│   │   └── calculate.js        # Price difference calculator
│   ├── storage/                # Storage interfaces
│   │   ├── kv.js               # KV storage operations
│   │   └── r2.js               # R2 storage operations
│   └── utils/                  # Utility functions
│       ├── logger.js           # Logging utility
│       ├── error.js            # Error handling
│       └── mime.js             # MIME type utility
│
├── frontend/                   # Frontend source files (deployed to Cloudflare Pages)
│   ├── index.html              # Main HTML page
│   ├── js/                     # JavaScript files
│   │   └── main.js             # Main JS logic
│   ├── css/                    # CSS styles
│   │   └── styles.css          # Main stylesheet
│   └── assets/                 # Images and other assets
│
├── wrangler.example.toml       # Example Wrangler configuration 
├── wrangler.toml               # Actual configuration (not in Git)
├── package.json                # Node.js dependencies
├── README.md                   # Project documentation
├── TECHNICAL_SPEC.md           # Technical specifications
└── refactoring-plan.md         # Refactoring plan
```

## Data Format

### Product Data JSON Structure

```json
{
  "metadata": {
    "lastUpdated": "2025-03-30T12:00:00.000Z",
    "exchangeRates": { "USD": 1.0, "TWD": 31.5 },
    "regions": ["US", "TW"],
    "productType": "iphone",
    "totalProducts": 40
  },
  "products": [
    {
      "SKU_US": "ABCD1234",
      "SKU_TW": "EFGH5678",
      "Price_US": 999,
      "Price_TW": 31900,
      "PRODUCT_NAME": "iPhone 16 Pro 128GB Black Titanium",
      "price_difference_percent": 0.8,
      "product_type": "iphone"
    },
    // Additional products...
  ]
}
```

### Exchange Rate Data JSON Structure

```json
{
  "rates": {
    "USD": 1.0,
    "TWD": 31.53
  },
  "lastUpdated": "2025-03-30T14:30:22.456789",
  "source": "Cathay Bank"
}
```

## R2-Based Static JSON Approach

This project uses an R2-based static JSON approach with a separate static frontend:

1. **How it Works**:
   - The Worker scrapes and processes data, then stores it in both KV and R2
   - R2 bucket stores static JSON files that are publicly accessible
   - The static frontend is hosted on Cloudflare Pages
   - Frontend JavaScript fetches data directly from R2 static JSON files
   - This separates concerns between data processing and presentation layers

2. **Benefits**:
   - **Simplified Architecture**: No need for API endpoints to serve data
   - **Improved Performance**: Static JSON files are served directly from Cloudflare's edge
   - **Reduced Worker Usage**: Worker only handles updates, not serving data
   - **Better Caching**: R2 files can be cached with appropriate headers
   - **Cost Efficiency**: Fewer Worker invocations means lower costs

3. **Implementation Details**:
   - Worker stores processed data in R2 bucket
   - R2 bucket is configured for public access
   - Frontend uses fetch API to retrieve data directly from R2
   - No CORS issues since R2 can be configured to allow cross-origin requests
   - Caching headers optimize performance for static JSON files

## Background Operations

The Worker performs several background operations:

1. **Scheduled Data Updates**: The Worker updates product and exchange rate data daily using a Cron trigger.

2. **Data Scraping Process**:
   - Dynamically detects available iPhone and iPad models
   - Scrapes product information from Apple's website for each region
   - Extracts product details from JSON data in the metrics script tag
   - Standardizes product names for accurate cross-region matching
   - Merges data from different regions based on standardized names

3. **Exchange Rate Fetching**:
   - Fetches the current USD/TWD exchange rate from Cathay Bank
   - Includes fallback mechanisms if fetching fails
   - Stores exchange rate data in KV storage

4. **Data Storage and Serving**:
   - Stores data in both KV and R2 storage
   - KV storage is used for Worker internal operations
   - R2 storage provides static JSON files for frontend access
   - Implements appropriate caching headers for optimal performance

## Extending the Project

You can extend this project in the following ways:

1. **Add More Regions**:
   - Update the `REGIONS` configuration in `config.js`
   - The system will automatically handle the new regions in the scraping process

2. **Add More Product Categories**:
   - Create new scraper modules following the pattern of existing ones
   - Update the frontend to display the new categories
   - Add new API endpoints for the new categories

3. **Enhance the Frontend**:
   - Add data visualization features
   - Implement persistent comparison features
   - Add export functionality

## Notes and Limitations

- Cloudflare Workers have execution time limits (10ms CPU time on free plans, 50ms on paid plans)
- The scraper implements proper rate limiting to avoid being blocked by Apple's servers
- This tool is for personal research and comparison only
- The tool currently doesn't track historical price data
- CORS must be properly configured when API and frontend are on different domains

## Troubleshooting

- **API Returns 500 Error**: Check the Worker logs in Cloudflare Dashboard for error details
- **Scraper Not Working**: Apple may have changed their website structure; check the scraping logic
- **Frontend Not Loading**: Ensure the frontend build was successful and properly deployed
- **CORS Errors**: Verify CORS configuration in the Worker API
- **KV Read Errors**: Make sure your KV namespace IDs are correctly set in `wrangler.toml`
- **R2 Storage Issues**: Verify R2 bucket binding in `wrangler.toml` and check if the bucket is properly configured for public access
- **R2 Data Not Updating**: Check if the Worker has permission to write to the R2 bucket
- **API Key Issues**: Check if the API key is correctly set as a secret or environment variable

## License

This project is not affiliated with, authorized by, or endorsed by Apple Inc. All product names, logos, and brands are the property of their respective owners.
