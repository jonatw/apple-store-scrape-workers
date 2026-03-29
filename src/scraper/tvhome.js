/**
 * Apple TV & HomePod scraper — fetches TV and HomePod data from Apple Store.
 *
 * Handles two product categories (Apple TV + HomePod) with different URL
 * patterns, combined into a single output.
 * Port of Python tvhome.py.
 */

import { REGIONS, DEFAULT_TV_MODELS, DEFAULT_HOMEPOD_MODELS, REQUEST_DELAY } from '../config';
import { fetchProductPage, discoverModelsFromGoto } from './base';

const PRODUCT_NAME = 'Apple TV & HomePod';

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Accept': 'text/html,application/xhtml+xml',
};

/**
 * Discover TV and HomePod models from Apple's tv-home landing page.
 * @returns {Promise<{tvModels: string[], homepodModels: string[]}>}
 */
async function discoverAllModels() {
  const tvModels = new Set();
  const homepodModels = new Set();

  for (const regionCode of Object.keys(REGIONS)) {
    const prefix = regionCode ? `/${regionCode}` : '';
    const url = `https://www.apple.com${prefix}/tv-home/`;

    try {
      const response = await fetch(url, { headers: FETCH_HEADERS });
      if (!response.ok) continue;

      const html = await response.text();

      // Find TV goto links
      const tvRegex = /\/shop\/goto\/buy_tv\/([^"'\s]+)/g;
      for (const m of html.matchAll(tvRegex)) {
        const model = m[1].split('?')[0].split('#')[0].replace(/_/g, '-');
        if (model) tvModels.add(model);
      }

      // Find HomePod goto links
      const homepodRegex = /\/shop\/goto\/buy_homepod\/([^"'\s]+)/g;
      for (const m of html.matchAll(homepodRegex)) {
        const model = m[1].split('?')[0].split('#')[0].replace(/_/g, '-');
        if (model) homepodModels.add(model);
      }
    } catch (e) {
      console.log(`  Error accessing ${url}: ${e.message}`);
    }
  }

  return {
    tvModels: tvModels.size > 0 ? [...tvModels] : DEFAULT_TV_MODELS,
    homepodModels: homepodModels.size > 0 ? [...homepodModels] : DEFAULT_HOMEPOD_MODELS,
  };
}

/**
 * Fetch all Apple TV & HomePod products from all regions.
 * Overrides the standard fetchAllProducts because TV and HomePod
 * use different URL patterns.
 */
export async function getAllProducts() {
  console.log(`Fetching ${PRODUCT_NAME} data...`);
  const { tvModels, homepodModels } = await discoverAllModels();
  console.log(`  TV models: ${tvModels.join(', ')}`);
  console.log(`  HomePod models: ${homepodModels.join(', ')}`);

  const allProducts = [];

  // Fetch TV products
  for (const model of tvModels) {
    for (const regionCode of Object.keys(REGIONS)) {
      const prefix = regionCode ? `/${regionCode}` : '';
      const url = `https://www.apple.com${prefix}/shop/buy-tv/${model}`;
      console.log(`  Scraping ${url}...`);
      const products = await fetchProductPage(url, regionCode);
      allProducts.push(...products);
      await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
    }
  }

  // Fetch HomePod products
  for (const model of homepodModels) {
    for (const regionCode of Object.keys(REGIONS)) {
      const prefix = regionCode ? `/${regionCode}` : '';
      const url = `https://www.apple.com${prefix}/shop/buy-homepod/${model}`;
      console.log(`  Scraping ${url}...`);
      const products = await fetchProductPage(url, regionCode);
      allProducts.push(...products);
      await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
    }
  }

  console.log(`  ${PRODUCT_NAME}: ${allProducts.length} total products fetched`);
  return allProducts;
}
