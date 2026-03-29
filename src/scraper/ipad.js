/**
 * iPad scraper — fetches iPad product data from Apple Store across regions.
 * Uses metrics extraction strategy via shared base framework.
 */

import { REGIONS, DEFAULT_IPAD_MODELS } from '../config';
import { discoverModels, fetchAllProducts } from './base';

const PRODUCT_NAME = 'iPad';

async function getModels() {
  const url = 'https://www.apple.com/shop/buy-ipad';
  const models = await discoverModels('', url, '/shop/buy-ipad/', DEFAULT_IPAD_MODELS);
  return models.filter(m => m.startsWith('ipad'));
}

function buildUrl(model, regionCode) {
  const prefix = regionCode ? `/${regionCode}` : '';
  return `https://www.apple.com${prefix}/shop/buy-ipad/${model}`;
}

/**
 * Fetch all iPad products from all regions.
 */
export async function getAllProducts() {
  return fetchAllProducts({
    productName: PRODUCT_NAME,
    discoverModelsFn: getModels,
    buildUrl,
  });
}
