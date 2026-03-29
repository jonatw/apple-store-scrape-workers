/**
 * AirPods scraper — fetches AirPods data from Apple Store across regions.
 *
 * Uses bootstrap extraction strategy via shared base framework.
 * Model discovery uses goto-link pattern from marketing page.
 * Port of Python airpods.py.
 */

import { DEFAULT_AIRPODS_MODELS } from '../config';
import { discoverModelsFromGoto, fetchAllProducts } from './base';

const PRODUCT_NAME = 'AirPods';

async function getModels() {
  // Aggregate models from all regions
  const allModels = new Set();

  for (const regionCode of ['', 'tw']) {
    const prefix = regionCode ? `/${regionCode}` : '';
    const url = `https://www.apple.com${prefix}/airpods/`;
    const models = await discoverModelsFromGoto(
      regionCode, url, '/shop/goto/buy_airpods/', DEFAULT_AIRPODS_MODELS
    );
    for (const m of models) allModels.add(m);
  }

  return allModels.size > 0 ? [...allModels] : DEFAULT_AIRPODS_MODELS;
}

function buildUrl(model, regionCode) {
  const prefix = regionCode ? `/${regionCode}` : '';
  return `https://www.apple.com${prefix}/shop/buy-airpods/${model}`;
}

/**
 * Fetch all AirPods products from all regions.
 */
export async function getAllProducts() {
  return fetchAllProducts({
    productName: PRODUCT_NAME,
    discoverModelsFn: getModels,
    buildUrl,
  });
}
