# Apple Store Scraper Architecture Refactoring Plan

This document details the refactoring plan for Apple Store Scraper, transitioning from an HTML prefill architecture to an R2-based static JSON file architecture.

## Goals

- [x] Remove HTML prefill functionality
- [x] Implement R2 storage for JSON data files
- [x] Keep the update functionality that works correctly
- [x] Simplify the project structure by removing unnecessary components
- [x] Make frontend simpler by fetching data from static JSON files

## New Architecture Overview

- **Worker**: Handles data scraping, processing, and storage
  - Scrapes data from Apple's website
  - Processes and standardizes the data
  - Stores data in both KV and R2 storage
  - Provides an authenticated update endpoint
- **R2 Bucket**: Stores static JSON files that can be accessed directly
  - Configured for public access
  - Serves JSON files with appropriate cache headers
- **Frontend**: Static HTML/CSS/JS that fetches data directly from R2
  - No need for API calls to the Worker
  - Simpler, more efficient architecture

## Implementation Checklist

### 1. Setup R2 Storage

- [x] Create R2 storage module (`src/storage/r2.js`)
- [x] Implement functions to store JSON data in R2
- [x] Update `wrangler.toml` to include R2 binding
```toml
[[r2_buckets]]
binding = "APPLE_STORE_DATA_BUCKET"
bucket_name = "apple-store-data"
preview_bucket_name = "apple-store-data-dev"
```

### 2. Update Data Processing

- [x] Modify `updater.js` to store data in both KV and R2
- [x] Create combined data object for all.json
- [x] Store individual data files (iphone.json, ipad.json, exchange-rate.json)

### 3. Update Services

- [x] Update `dataService.js` to remove HTML cache clearing operations
- [x] Add R2 data access functions

### 4. Update Router and Handlers

- [x] Update `router.js` to remove HTML routes
- [x] Keep only API and development test routes
- [x] Add test route for R2 storage
- [x] Update `handlers/index.js` to remove HTML handlers

### 5. Update Frontend

- [x] Update `frontend/js/main.js` to fetch data from R2 URLs
- [x] Remove prefill loading code
- [x] Implement loading states for data fetching
- [x] Update `frontend/index.html` to remove prefilled data script tag

### 6. Files to Delete

The following files are no longer needed and should be deleted:

- [ ] src/handlers/htmlHandler.js - No longer need HTML generation
- [ ] src/handlers/staticHandler.js - Static files will be served via R2
- [ ] src/services/prefillService.js - No longer using prefill approach
- [ ] src/services/cacheService.js - No longer needed for HTML caching

### 7. Deployment Steps

- [ ] Create KV namespaces
```bash
# Create KV namespace for production
wrangler kv namespace create APPLE_STORE_DATA
# Create KV namespace for preview/development
wrangler kv namespace create APPLE_STORE_DATA --preview
```

- [ ] Update wrangler.toml with KV namespace IDs
```toml
[[kv_namespaces]]
binding = "APPLE_STORE_DATA"
id = "your-kv-namespace-id-from-above-command"
preview_id = "your-preview-kv-namespace-id-from-above-command"
```

- [ ] Create R2 bucket in Cloudflare Dashboard
```bash
# Create R2 bucket
wrangler r2 bucket create apple-store-data
# Create development/preview bucket
wrangler r2 bucket create apple-store-data-dev
```

- [ ] Configure R2 public access (through Cloudflare Dashboard)
  1. Go to Cloudflare Dashboard > R2
  2. Select your bucket "apple-store-data"
  3. Go to Settings > Public Access
  4. For custom domain:
     - Under "Custom Domains", click "Connect Domain"
     - Enter "data.apple-store-scraper.pages.dev" (replace with your actual domain)
     - Review the DNS record and click "Connect Domain"
  5. Alternatively, for r2.dev subdomain:
     - Under "R2.dev subdomain", click "Allow Access"
     - Type 'allow' to confirm and click "Allow"

- [ ] Set up API key for secure updates
```bash
# For development, you can use the API_KEY in wrangler.toml
# For production, use wrangler secret
wrangler secret put API_KEY
# Enter a secure API key when prompted
```

- [ ] Deploy Worker with R2 bindings
```bash
wrangler deploy
```

- [ ] Deploy frontend to Cloudflare Pages
  1. Go to Cloudflare Dashboard > Pages
  2. Click "Create a project"
  3. Connect your GitHub repository
  4. Configure build settings:
     - Build command: (leave empty if no build process is needed)
     - Build output directory: `frontend`
  5. Click "Save and Deploy"

- [ ] Verify deployment
  1. Test the Worker update endpoint:
     ```bash
     curl -X POST https://apple-store-scraper.workers.dev/api/update \
       -H "Authorization: Bearer your-api-key"
     ```
  2. Check if data is stored in R2 by visiting:
     ```
     https://data.apple-store-scraper.pages.dev/data/all.json
     ```
  3. Visit your Pages site to verify the frontend is working:
     ```
     https://apple-store-scraper.pages.dev
     ```

### 8. Local Development Guide

#### Prerequisites for Local Development

1. **Set up local KV namespaces**:
   ```bash
   # Create local KV namespace for development
   wrangler kv namespace create APPLE_STORE_DATA --preview
   ```

2. **Update wrangler.toml with KV namespace IDs**:
   ```toml
   [[kv_namespaces]]
   binding = "APPLE_STORE_DATA"
   id = "your-production-kv-namespace-id"
   preview_id = "your-preview-kv-namespace-id-from-above-command"
   ```

3. **Set up API key for local development**:
   - You can use the API_KEY in wrangler.toml for development
   - Make sure it's set to a secure value

#### Running the Worker Locally

1. **Start the Worker in development mode**:
   ```bash
   wrangler dev
   ```

2. **This will start the Worker at http://localhost:8787**

#### Running the Frontend Locally

1. **Using a simple static server**:
   ```bash
   # Install serve if you don't have it
   npm install -g serve
   
   # Start the server
   serve frontend -p 3000
   ```

2. **Or using npx**:
   ```bash
   npx serve frontend -p 3000
   ```

3. **The frontend will be accessible at http://localhost:3000**

#### Testing the Local Setup

1. **Initialize data by triggering the update endpoint**:
   ```bash
   # Using the dev-test-update endpoint (no auth required)
   curl http://localhost:8787/dev-test-update
   
   # Or using the regular update endpoint with API key
   curl -X POST http://localhost:8787/api/update \
     -H "Authorization: Bearer your-api-key"
   ```

2. **Test R2 storage functionality**:
   ```bash
   curl http://localhost:8787/test-r2
   ```

3. **Access the API endpoints directly**:
   ```bash
   # Get all data
   curl http://localhost:8787/api/all
   
   # Get iPhone data
   curl http://localhost:8787/api/iphone
   
   # Get iPad data
   curl http://localhost:8787/api/ipad
   ```

4. **Open the frontend in your browser**:
   - Navigate to http://localhost:3000
   - The frontend should automatically detect it's running locally and use the local Worker API

#### Troubleshooting Local Development

1. **CORS Issues**:
   - If you see CORS errors in the browser console, make sure the Worker's CORS middleware is properly configured
   - The frontend is set up to detect local development and use the local Worker API

2. **KV Storage Issues**:
   - Make sure you've created the local KV namespace and updated wrangler.toml
   - Check if the Worker can read from and write to KV storage

3. **R2 Storage Issues**:
   - R2 storage might not work fully in local development
   - The Worker will fall back to KV storage if R2 operations fail

4. **API Key Issues**:
   - Make sure the API_KEY is set in wrangler.toml for local development
   - For testing the update endpoint, use the dev-test-update endpoint which doesn't require authentication

5. **Frontend Not Loading Data**:
   - Check the browser console for errors
   - Verify that the Worker API is running and accessible
   - Make sure the data has been initialized by triggering the update endpoint

## R2 Storage Structure

```
/data/
  iphone.json       # iPhone data
  ipad.json         # iPad data
  exchange-rate.json # Exchange rate data
  all.json          # Combined data
```

## Frontend Implementation

The frontend now fetches data directly from R2 URLs:

```javascript
// Example of fetching data from R2
async function loadData() {
  try {
    // Fetch data from R2
    const response = await fetch('https://data.your-domain.pages.dev/data/all.json');
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    // Parse the JSON data
    const data = await response.json();
    
    // Process and display data
    // ...
  } catch (error) {
    console.error('Error loading data:', error);
    // Show error message
  }
}
```

## Testing

### Testing R2 Storage

Use the `/test-r2` endpoint to verify R2 storage is working correctly:

```
http://localhost:8787/test-r2
```

### Testing Data Update

Use the update endpoint to trigger data scraping and storage:

```
http://localhost:8787/api/update
```

## Benefits of This Approach

1. **Simplified Architecture**: No need for complex HTML prefill
2. **Better Performance**: Static JSON files are served directly from Cloudflare's edge
3. **Reduced Worker Usage**: Worker only handles updates, not serving data
4. **Better Caching**: R2 files can be cached with appropriate headers
5. **Separation of Concerns**: Clear separation between data updates and data serving
