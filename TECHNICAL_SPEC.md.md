# Apple Store Scraper (Cloudflare Workers) - Technical Specification

## Overview

Apple Store Scraper is a serverless application for scraping product information from the Apple online store, built on Cloudflare Workers. The application automates the collection of iPhone and iPad product prices and details, and performs cross-region comparisons with support for multiple configurable regions (currently US and Taiwan).

This is a reimplementation of the original Python-based Apple Store Scraper using Cloudflare Workers, providing improved performance, reliability, and global distribution.

## System Requirements

- **Cloudflare Account**: With Workers enabled
- **Memory Limits**: 128MB per Worker execution (Cloudflare limit)
- **CPU Time**: 10ms on free plan, 50ms on paid plans (Cloudflare limits)
- **Storage**: Cloudflare KV (value size limit: 25MB)
- **Node.js Version**: 14.x or higher (for local development)

## Dependencies

### JavaScript Dependencies

| Package Name | Purpose |
|---------|------|
| wrangler | Cloudflare Workers CLI and development environment |
| workerd | Cloudflare Workers runtime for local development |
| itty-router | Lightweight router for Cloudflare Workers |
| itty-cors | CORS middleware for itty-router |

### Frontend Dependencies

| Package Name | Purpose |
|---------|------|
| bootstrap | Responsive UI framework |
| @popperjs/core | Positioning engine for UI components |
| vite | Build tool and development server |

## Architecture

### Region Configuration

The system uses a flexible region configuration system:

```javascript
// Format: region_code: [display_name, currency_code, locale, currency_symbol]
const REGIONS = {
  "": ["US", "USD", "en-us", "$"],       // United States
  "tw": ["TW", "TWD", "zh-tw", "NT$"],   // Taiwan
  // Additional regions can be added here
};
```

### Components

The architecture consists of the following main components:

1. **Worker Entry Point**: Handles HTTP requests and routes to appropriate handlers
2. **API Handlers**: Process API requests and return JSON responses
3. **Scraper Modules**: Fetch product data from Apple's website
4. **Data Processors**: Standardize, merge, and calculate data
5. **Storage Interface**: Interface with Cloudflare KV storage
6. **Authentication**: Verify API keys for secure endpoints
7. **Static Frontend**: Served via Workers Sites

### Background Processes

The Worker includes two execution modes:

1. **On-Demand**: Triggered via the API
2. **Scheduled**: Executed daily via Cron trigger

## Module Descriptions

### index.js

Main entry point for the Worker, handling all HTTP requests.

#### Main Functions

- `handleRequest(request)`:
  - **Purpose**: Central request handler
  - **Process**:
    - Parses URL and request method
    - Routes to appropriate handler based on path
    - Serves static assets for frontend requests
    - Routes API requests to API handlers

- `handleApiRequest(request)`:
  - **Purpose**: Process API requests
  - **Process**:
    - Extracts path and method
    - Routes to specific API handlers
    - Formats and returns JSON responses
    - Implements error handling

### scraper/iphone.js

iPhone product information scraping module with multi-region support and dynamic model detection.

#### Main Functions

- `standardizeProductName(name)`:
  - **Purpose**: Creates a standardized product name for matching across regions
  - **Process**: 
    - Uses regex to extract model, capacity, and color information
    - Creates a consistent format like "iphone16pro_256gb_blacktitanium"
    - Allows matching equivalent products across regions with different naming

- `getAvailableModels(regionCode="")`:
  - **Purpose**: Dynamically detects available iPhone models from Apple's website
  - **Process**:
    - Fetches the main iPhone page
    - Extracts model identifiers from URLs using regex
    - Provides fallback to default models if detection fails

- `extractProductDetails(url, regionCode="")`:
  - **Purpose**: Scrapes product information from a specific URL
  - **Process**:
    - Fetches the product page HTML
    - Extracts product data from the JSON in the metrics script tag
    - Standardizes product names for matching
    - Includes region-specific information

- `getAllProducts()`:
  - **Purpose**: Aggregates products from all configured regions
  - **Process**:
    - Gets unique models across all regions
    - Scrapes each model for each region
    - Returns a combined list of products

### scraper/ipad.js

iPad product information scraping module with multi-region support and dynamic model detection.

#### Main Functions

Similar to iphone.js but adapted for iPad products.

### scraper/exchange-rate.js

Module for fetching current exchange rates.

#### Main Functions

- `fetchExchangeRate()`:
  - **Purpose**: Fetches the current USD/TWD exchange rate
  - **Process**:
    - Makes HTTP request to Cathay Bank's exchange rate page
    - Extracts the USD/TWD selling rate
    - Handles errors with fallback mechanisms
    - Returns the rate as a number

### processor/standardize.js

Utilities for standardizing product information across regions.

#### Main Functions

- `standardizeProductName(name)`:
  - **Purpose**: Creates consistent product identifiers
  - **Process**:
    - Uses regex patterns to extract product features
    - Formats extracted information consistently
    - Returns standardized name for cross-region matching

### processor/merge.js

Data merging utilities to combine products from different regions.

#### Main Functions

- `mergeProductData(products)`:
  - **Purpose**: Merges products from different regions
  - **Process**:
    - Groups products by region
    - Creates region-specific columns for SKUs and prices
    - Merges products based on standardized name matching
    - Organizes columns in the preferred order

### processor/calculate.js

Utilities for calculating price differences and other metrics.

#### Main Functions

- `calculatePriceDifferences(products, exchangeRate)`:
  - **Purpose**: Calculates price differences between regions
  - **Process**:
    - Converts prices to USD using exchange rates
    - Calculates percentage differences
    - Flags products with significant price differences
    - Returns products with added calculation fields

### storage/kv.js

Interface for Cloudflare KV storage operations.

#### Main Functions

- `getData(key)`:
  - **Purpose**: Retrieves data from KV storage
  - **Process**:
    - Fetches value by key
    - Parses JSON data
    - Handles errors and missing data

- `setData(key, data)`:
  - **Purpose**: Stores data in KV storage
  - **Process**:
    - Serializes data to JSON
    - Stores with specified key
    - Handles errors

### auth/verify.js

Authentication utilities for secure endpoints.

#### Main Functions

- `verifyApiKey(request)`:
  - **Purpose**: Validates API key for protected endpoints
  - **Process**:
    - Extracts API key from Authorization header
    - Compares with stored key
    - Returns boolean indicating validity

### updater.js

Orchestrates the complete data update process.

#### Main Functions

- `updateAllData()`:
  - **Purpose**: Coordinates the complete data update process
  - **Process**:
    - Calls scraper functions to get product data
    - Processes and merges data
    - Fetches exchange rates
    - Calculates price differences
    - Stores results in KV
    - Returns success/failure

## Data Structures

### Configuration Data

```javascript
// Define regions to scrape
const REGIONS = {
  "": ["US", "USD", "en-us", "$"],       // United States
  "tw": ["TW", "TWD", "zh-tw", "NT$"],   // Taiwan
};

// Reference region for product naming
const REFERENCE_REGION = Object.keys(REGIONS)[0];
```

### Input Data

Example of JSON structure scraped from the webpage (simplified):
```json
{
  "data": {
    "products": [
      {
        "sku": "MYMG3",
        "name": "iPhone 16 Pro 256GB Black Titanium",
        "price": {
          "fullPrice": 1099.0
        },
        "category": "iphone",
        "partNumber": "MYMG3LL/A"
      }
    ]
  }
}
```

### Exchange Rate Data Structure

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

### Product Matching Strategies

#### iPhone - Standardized Name Matching

The iPhone scraper uses a regex-based approach to standardize product names:
1. Extract model information (e.g., "iphone16pro" from "iPhone 16 Pro")
2. Extract capacity (e.g., "256gb")
3. Extract color (e.g., "blacktitanium")
4. Create a standardized key like "iphone16pro_256gb_blacktitanium"
5. Match products across regions using this key

#### iPad - SKU Matching

The iPad scraper uses a simpler SKU-based matching approach:
1. Use the SKU as a common identifier across regions
2. Merge data using SKU as the key

### Output Data Formats

#### Product Data JSON Structure
```json
{
  "metadata": {
    "lastUpdated": "2025-03-30T14:30:22.456789",
    "exchangeRates": {
      "USD": 1.0,
      "TWD": 31.53
    },
    "regions": ["US", "TW"],
    "productType": "iphone",
    "totalProducts": 40,
    "lastExchangeRateUpdate": "2025-03-30T14:30:22.456789",
    "exchangeRateSource": "Cathay Bank"
  },
  "products": [
    {
      "SKU_US": "MLG33LL/A",
      "SKU_TW": "MLG33ZP/A",
      "Price_US": 999.0,
      "Price_TW": 31900.0,
      "PRODUCT_NAME": "iPhone 16 Pro 128GB Natural Titanium",
      "price_difference_percent": 0.8,
      "product_type": "iphone"
    }
  ]
}
```

## API Endpoints

### GET /api/iphone

Returns the latest iPhone product data.

**Response Format**:
- Content-Type: application/json
- Body: iPhone product data JSON structure

### GET /api/ipad

Returns the latest iPad product data.

**Response Format**:
- Content-Type: application/json
- Body: iPad product data JSON structure

### GET /api/exchange-rate

Returns the current exchange rate data.

**Response Format**:
- Content-Type: application/json
- Body: Exchange rate JSON structure

### POST /api/update

Triggers a data update process.

**Authentication**:
- Requires API key in Authorization header: `Authorization: Bearer your-api-key`

**Response Format**:
- Status 200: Update successful
- Status 401: Unauthorized (invalid API key)
- Status 500: Update failed with error details

## Frontend Architecture

### Core Components

1. **Settings Panel**:
   - Exchange rate input with auto-population from backend data
   - Foreign transaction fee adjustment
   - Collapsible interface for better mobile experience
   - Local storage persistence for user preferences

2. **Price Summary Cards**:
   - Product count display
   - Average price difference (with and without fees)
   - Last updated timestamp
   - Visual indicators for favorable pricing regions

3. **Product Table**:
   - Responsive design with horizontal scrolling on mobile
   - Search functionality for filtering products
   - Sortable columns
   - Color-coded price differences
   - Purchase recommendation badges

4. **Theme System**:
   - Light/dark mode toggle
   - System preference detection
   - Local storage persistence
   - Dynamic styling adaptation

## Execution Flow

### Request Handling Flow

1. **Request Received**: Worker receives HTTP request
2. **Route Determination**: Request is routed based on URL path
3. **API vs. Frontend**: Request is sent to API handler or serves frontend assets
4. **Response Generation**: Generate and return appropriate response

### API Request Flow

1. **API Request Received**: API path detected in request
2. **Authentication Check**: For protected endpoints, verify API key
3. **Data Retrieval/Update**: Get data from KV or trigger update process
4. **Response Formatting**: Format data as JSON response
5. **Error Handling**: Catch and handle any errors

### Data Update Flow

1. **Update Triggered**: Via Cron or API request
2. **Fetch Models**: Get available models for each product category
3. **Scrape Products**: Fetch product data for each model and region
4. **Fetch Exchange Rates**: Get current exchange rates
5. **Process Data**: Standardize, merge, and calculate price differences
6. **Store Results**: Save processed data to KV storage
7. **Return Status**: Return success or failure status

## Performance Considerations

- **Execution Time**: Must complete within Cloudflare Workers limits
  - Critical path optimization to stay within 10ms/50ms CPU time
  - Asynchronous operations where possible
  - Rate limiting to avoid overloading Apple's servers

- **Memory Usage**:
  - Careful management to stay within 128MB limit
  - Stream processing instead of loading all data at once
  - Efficient data structures and algorithms

- **KV Performance**:
  - Strategic key design for efficient lookups
  - Minimizing KV operations due to higher latency
  - Appropriate caching strategies

## Error Handling and Resilience

1. **Scraping Failures**:
   - Fallback to default models when detection fails
   - Graceful handling of HTTP errors
   - Multiple retry attempts with exponential backoff

2. **Data Processing Errors**:
   - Validation of scraped data before processing
   - Default values for missing fields
   - Logging of error details for debugging

3. **Exchange Rate Failures**:
   - Fallback to previously saved rates
   - Default value if no rates available
   - Warning indicator on frontend when using fallback

4. **KV Storage Errors**:
   - Retry logic for failed operations
   - Temporary in-memory caching during outages
   - Appropriate error propagation to API clients

## Deployment Workflow

1. **Local Development**:
   - Develop and test using `wrangler dev`
   - Simulate Cron triggers locally

2. **Testing**:
   - Test API endpoints
   - Verify scraping logic
   - Test error handling

3. **Deployment**:
   - Build frontend assets
   - Deploy using `wrangler publish`
   - Verify initial data population

4. **Monitoring**:
   - Monitor Worker execution metrics
   - Set up alerts for failures
   - Review logs for errors

## Extensibility

The system is designed for extensibility:

### Adding New Regions

1. Add region entries to the `REGIONS` object:
```javascript
"jp": ["JP", "JPY", "ja-jp", "¥"]  // Japan
```

2. The system will automatically:
   - Include the new region in data collection
   - Add region-specific columns to the output

### Adding New Product Categories

1. Create a new scraper module following the pattern of existing scrapers
2. Update the updateAllData function to include the new category
3. Add a new API endpoint for the category
4. Update the frontend to display the new category

## Limitations and Constraints

1. **Cloudflare Workers Limitations**:
   - CPU time limits (10ms free tier, 50ms paid)
   - 128MB memory limit
   - KV value size limit (25MB)
   - KV operations latency

2. **Scraping Limitations**:
   - Dependence on Apple's website structure
   - Rate limiting requirements
   - Potential IP blocking

3. **Data Accuracy**:
   - Exchange rate volatility
   - Product pricing updates timing
   - Regional product availability differences

## Future Enhancement Opportunities

- **Historical Data Tracking**:
  - Store historical price data
  - Implement trend visualization
  - Price change notifications

- **Additional Data Points**:
  - Availability status
  - Shipping times
  - Product specifications

- **Advanced Frontend Features**:
  - Side-by-side product comparison
  - Price alerts
  - Customizable dashboard

- **Performance Optimizations**:
  - Incremental updates
  - Parallel scraping
  - Smart caching strategies

## Security Considerations

1. **API Protection**:
   - API key validation for update endpoints
   - Rate limiting to prevent abuse
   - Input validation to prevent injection attacks

2. **Data Validation**:
   - Sanitize all scraped data
   - Validate data structures before storage
   - Protect against malformed input

3. **Frontend Security**:
   - Content Security Policy
   - XSS protection
   - CSRF protection for forms

## Version Changelog

### Version 1.0.0 (Initial Release)
- Cloudflare Workers reimplementation of Apple Store Scraper
- Support for iPhone and iPad product information scraping
- Support for US and Taiwan region comparison
- Daily automated updates via Cron trigger
- JSON API endpoints for data access
- Responsive web interface