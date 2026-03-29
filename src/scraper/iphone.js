/**
 * iPhone scraper — fetches iPhone product data from Apple Store across regions.
 * Uses metrics extraction strategy via shared base framework.
 */

import { REGIONS, DEFAULT_IPHONE_MODELS } from '../config';
import { discoverModels, fetchAllProducts } from './base';

const PRODUCT_NAME = 'iPhone';

async function getModels() {
  const url = 'https://www.apple.com/shop/buy-iphone';
  const models = await discoverModels('', url, '/shop/buy-iphone/', DEFAULT_IPHONE_MODELS);
  // Filter to actual iPhone model slugs
  return models.filter(m => m.startsWith('iphone'));
}

function buildUrl(model, regionCode) {
  const prefix = regionCode ? `/${regionCode}` : '';
  return `https://www.apple.com${prefix}/shop/buy-iphone/${model}`;
}

/**
 * Fetch all iPhone products from all regions.
 */
export async function getAllProducts() {
  return fetchAllProducts({
    productName: PRODUCT_NAME,
    discoverModelsFn: getModels,
    buildUrl,
  });
}
