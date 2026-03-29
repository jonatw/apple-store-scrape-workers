/**
 * Shared scraping framework for Apple Store product scrapers.
 *
 * All product-specific scrapers use these shared functions to avoid
 * duplicating extraction, merging, and I/O logic.
 * Port of Python scraper_base.py.
 */

import { REGIONS, REQUEST_DELAY } from '../config';

// ==================== SKU UTILITIES ====================

/**
 * Strip region-specific suffix from a part number to get the base SKU.
 * e.g. "MYW23LL/A" → "MYW23", "MYW23FE/A" → "MYW23"
 */
export function stripRegionSuffix(partNumber) {
  if (!partNumber) return partNumber;
  let result = partNumber.replace(/[A-Z]{2}\/[A-Z]$/, '');
  result = result.replace(/\/[A-Z]$/, '');
  return result;
}

// ==================== PRODUCT EXTRACTION ====================

/**
 * Strategy 1: Extract products from <script id="metrics"> JSON block.
 * Standard data source on most Apple Store buy pages (iPhone, iPad, TV/Home).
 */
export function extractProductsFromMetrics(html, regionCode) {
  const regionDisplay = REGIONS[regionCode]?.[0] || 'Unknown';

  const metricsMatch = html.match(/<script id="metrics" type="application\/json">(.*?)<\/script>/s);
  if (!metricsMatch) return [];

  try {
    const metricsData = JSON.parse(metricsMatch[1]);
    const products = metricsData?.data?.products;
    if (!Array.isArray(products) || products.length === 0) return [];

    console.log(`  Found ${products.length} products via metrics for ${regionDisplay}`);

    return products.map(product => {
      const sku = product.sku || '';
      const partNumber = product.partNumber || '';
      const baseSku = partNumber ? stripRegionSuffix(partNumber) : sku;

      return {
        SKU: baseSku,
        OriginalSKU: sku || partNumber,
        Name: (product.name || '').replace(/\u00a0/g, ' ').trim(),
        Price: product.price?.fullPrice ?? 0,
        Region: regionDisplay,
        Region_Code: regionCode,
        PartNumber: partNumber,
      };
    });
  } catch (e) {
    console.error('Error parsing metrics JSON:', e.message);
    return [];
  }
}

/**
 * Strategy 2: Extract products from window.PRODUCT_SELECTION_BOOTSTRAP.
 * Used for Mac, Watch, AirPods — products with configurable options.
 */
export function extractProductsFromBootstrap(html, regionCode) {
  const regionDisplay = REGIONS[regionCode]?.[0] || 'Unknown';

  // Find the script containing PRODUCT_SELECTION_BOOTSTRAP
  const bootstrapMatch = html.match(/window\.PRODUCT_SELECTION_BOOTSTRAP\s*=/);
  if (!bootstrapMatch) return [];

  try {
    const keyIndex = html.indexOf('productSelectionData:', bootstrapMatch.index);
    if (keyIndex === -1) return [];

    const startIndex = html.indexOf('{', keyIndex);
    if (startIndex === -1) return [];

    // Extract JSON by balanced brace counting
    let braceCount = 0;
    let jsonStr = '';
    for (let i = startIndex; i < html.length; i++) {
      const char = html[i];
      if (char === '{') braceCount++;
      else if (char === '}') braceCount--;
      jsonStr += char;
      if (braceCount === 0) break;
    }

    if (!jsonStr) return [];

    const bootstrapData = JSON.parse(jsonStr);
    const products = bootstrapData.products || [];

    // Prices can be in displayValues.prices OR mainDisplayValues.prices
    let pricesMap = bootstrapData.displayValues?.prices || {};
    if (Object.keys(pricesMap).length === 0) {
      pricesMap = bootstrapData.mainDisplayValues?.prices || {};
    }

    if (products.length === 0) return [];

    console.log(`  Found ${products.length} products via bootstrap for ${regionDisplay}`);

    // Extract fallback name from page title
    let fallbackName = '';
    const titleMatch = html.match(/<title>(.*?)<\/title>/s);
    if (titleMatch) {
      fallbackName = titleMatch[1];
      // Strip " - Apple" or " - Apple (region)" suffix
      fallbackName = fallbackName.split(/\s*-\s*Apple/)[0].trim();
      // Strip common locale buy-prefixes
      for (const prefix of ['Buy ', '購買 ', 'Comprar ', 'Acheter ', 'Kaufen ']) {
        if (fallbackName.startsWith(prefix)) {
          fallbackName = fallbackName.slice(prefix.length);
          break;
        }
      }
      fallbackName = fallbackName.trim();
    }

    const result = [];
    for (const product of products) {
      // Part number: try multiple fields
      const partNumber = product.partNumber || product.part || product.btrOrFdPartNumber || '';
      const basePartNumber = product.basePartNumber;
      const baseSku = basePartNumber || stripRegionSuffix(partNumber);

      // Price lookup
      const priceKey = product.priceKey || product.fullPrice || product.price || '';
      const priceVal = parseBootstrapPrice(pricesMap, priceKey);

      // ConfigKey is a configuration identifier shared across regions
      const configKey = priceKey || '';

      // Name extraction
      const family = product.familyType || '';
      let name;
      if (family && family !== family.toLowerCase()) {
        name = family;
      } else {
        name = fallbackName || 'Unknown Product';
      }

      // Skip products with no usable identifier
      if (!baseSku && !partNumber && !name) continue;

      result.push({
        SKU: baseSku || partNumber || `unknown-${result.length}`,
        OriginalSKU: partNumber,
        Name: (name || '').replace(/\u00a0/g, ' ').trim(),
        ConfigKey: configKey,
        Price: priceVal ?? 0,
        Region: regionDisplay,
        Region_Code: regionCode,
        PartNumber: partNumber,
        _bootstrap_product: product, // preserved for post-processing hooks
      });
    }
    return result;
  } catch (e) {
    console.error('Error parsing bootstrap JSON:', e.message);
    return [];
  }
}

/**
 * Extract numeric price from bootstrap displayValues.prices map.
 */
function parseBootstrapPrice(pricesMap, priceKey) {
  if (!priceKey || !pricesMap) return null;
  const priceInfo = pricesMap[priceKey] || {};
  const currPrice = priceInfo.currentPrice || {};
  const rawAmount = currPrice.raw_amount;
  if (rawAmount != null) {
    const parsed = parseFloat(String(rawAmount).replace(/,/g, ''));
    if (!isNaN(parsed)) return parsed;
  }
  return null;
}

// ==================== PAGE FETCHING ====================

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

/**
 * Fetch an Apple Store product page and extract products using
 * dual-strategy approach (metrics first, then bootstrap fallback).
 * @param {string} url - Product page URL
 * @param {string} regionCode - Region code (e.g. "", "tw")
 * @param {Function} [postProcess] - Optional post-processing function(products, html)
 * @returns {Promise<Object[]>} List of product dicts
 */
export async function fetchProductPage(url, regionCode, postProcess = null) {
  const regionDisplay = REGIONS[regionCode]?.[0] || 'Unknown';

  try {
    const response = await fetch(url, { headers: FETCH_HEADERS });

    if (!response.ok) {
      console.log(`  Failed to retrieve ${url}. Status: ${response.status}`);
      return [];
    }

    const html = await response.text();

    // Try metrics first (more structured, preferred)
    let products = extractProductsFromMetrics(html, regionCode);

    // Fallback to bootstrap
    if (products.length === 0) {
      products = extractProductsFromBootstrap(html, regionCode);
    }

    // Apply post-processing if provided
    if (products.length > 0 && postProcess) {
      products = postProcess(products, html);
    }

    if (products.length === 0) {
      console.log(`  No products found at ${url}`);
    }

    return products;
  } catch (e) {
    console.error(`  Error fetching ${url}:`, e.message);
    return [];
  }
}

// ==================== MODEL DISCOVERY ====================

/**
 * Discover available models from an Apple Store landing page.
 * Looks for links matching the given pattern.
 */
export async function discoverModels(regionCode, landingUrl, linkPattern, defaultModels) {
  try {
    const response = await fetch(landingUrl, { headers: FETCH_HEADERS });
    if (!response.ok) {
      console.log(`  Cannot access ${landingUrl}, using default models`);
      return defaultModels;
    }

    const html = await response.text();
    const regex = new RegExp(`${linkPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([\\w-]+)`, 'g');
    const matches = [...html.matchAll(regex)];
    const models = [...new Set(matches.map(m => m[1].split('?')[0].split('#')[0]).filter(Boolean))];

    if (models.length > 0) {
      console.log(`  Discovered models: ${models.join(', ')}`);
      return models;
    }

    console.log(`  No models found at ${landingUrl}, using defaults`);
    return defaultModels;
  } catch (e) {
    console.error(`  Error discovering models: ${e.message}, using defaults`);
    return defaultModels;
  }
}

/**
 * Discover models from /shop/goto/ links on marketing pages.
 * Apple uses underscores in goto links but hyphens in store URLs.
 */
export async function discoverModelsFromGoto(regionCode, landingUrl, gotoPattern, defaultModels) {
  try {
    const response = await fetch(landingUrl, { headers: FETCH_HEADERS });
    if (!response.ok) {
      console.log(`  Cannot access ${landingUrl}, using default models`);
      return defaultModels;
    }

    const html = await response.text();
    const regex = new RegExp(`${gotoPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^"'\\s]+)`, 'g');
    const matches = [...html.matchAll(regex)];

    const models = new Set();
    for (const m of matches) {
      let model = m[1].split('?')[0].split('#')[0].replace(/_/g, '-');
      // Strip sub-configurations (e.g. /with_active_noise_cancellation)
      if (model.includes('/')) model = model.split('/')[0];
      if (model) models.add(model);
    }

    if (models.size > 0) {
      const result = [...models];
      console.log(`  Discovered models: ${result.join(', ')}`);
      return result;
    }

    console.log(`  No models found at ${landingUrl}, using defaults`);
    return defaultModels;
  } catch (e) {
    console.error(`  Error discovering models: ${e.message}, using defaults`);
    return defaultModels;
  }
}

// ==================== GENERIC FETCH ALL ====================

/**
 * Generic fetch-all-products function for standard scrapers.
 * Discovers models, then fetches each model × region combination.
 *
 * @param {Object} config
 * @param {string} config.productName - Display name (e.g. "iPhone")
 * @param {Function} config.discoverModelsFn - async () => string[] — returns model slugs
 * @param {Function} config.buildUrl - (model, regionCode) => URL string
 * @param {Function} [config.postProcess] - (products, html) => products
 * @returns {Promise<Object[]>} All products from all regions
 */
export async function fetchAllProducts({ productName, discoverModelsFn, buildUrl, postProcess }) {
  console.log(`Fetching ${productName} data...`);
  const models = await discoverModelsFn();
  console.log(`  Models to scrape: ${models.join(', ')}`);

  const allProducts = [];
  for (const model of models) {
    for (const regionCode of Object.keys(REGIONS)) {
      const url = buildUrl(model, regionCode);
      console.log(`  Scraping ${url}...`);

      const products = await fetchProductPage(url, regionCode, postProcess);
      allProducts.push(...products);

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
    }
  }

  console.log(`  ${productName}: ${allProducts.length} total products fetched`);
  return allProducts;
}
