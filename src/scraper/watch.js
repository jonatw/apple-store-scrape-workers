/**
 * Apple Watch scraper — fetches Watch data from Apple Store across regions.
 *
 * Watch pages use bootstrap extraction strategy. Product names are enriched
 * with case size and material from bootstrap dimension data.
 * Port of Python watch.py.
 */

import { DEFAULT_WATCH_MODELS } from '../config';
import { discoverModelsFromGoto, fetchAllProducts } from './base';

const PRODUCT_NAME = 'Apple Watch';

async function getModels() {
  // Aggregate models from all regions to avoid missing region-specific models
  const allModels = new Set();

  for (const regionCode of ['', 'tw']) {
    const prefix = regionCode ? `/${regionCode}` : '';
    const url = `https://www.apple.com${prefix}/watch/`;
    const models = await discoverModelsFromGoto(
      regionCode, url, '/shop/goto/buy_watch/', DEFAULT_WATCH_MODELS
    );

    // Apple's goto links use versioned slugs (apple-watch-series-11),
    // but buy URLs use unversioned slugs (apple-watch).
    // Normalize to unversioned buy-page slugs.
    for (const m of models) {
      const lower = m.toLowerCase();
      if (lower.includes('ultra')) allModels.add('apple-watch-ultra');
      else if (lower.includes('hermes')) allModels.add('apple-watch-hermes');
      else if (lower.includes('-se-') || lower.endsWith('-se')) allModels.add('apple-watch-se');
      else if (lower.includes('series') || lower.startsWith('apple')) allModels.add('apple-watch');
    }
  }

  return allModels.size > 0 ? [...allModels] : DEFAULT_WATCH_MODELS;
}

function buildUrl(model, regionCode) {
  const prefix = regionCode ? `/${regionCode}` : '';
  return `https://www.apple.com${prefix}/shop/buy-watch/${model}`;
}

/**
 * Post-process Watch products: enrich names with case size, material, connectivity.
 */
function postProcess(products, html) {
  for (const p of products) {
    const bp = p._bootstrap_product;
    if (!bp) continue;

    const dimensions = bp.dimensions || {};

    // Extract case size and material from bootstrap dimensions
    const caseSize = dimensions['watch_cases-dimensionCaseSize']?.value || '';
    const caseMaterial = dimensions['watch_cases-dimensionCaseMaterial']?.value || '';
    const caseSizeMaterial = [caseSize, caseMaterial].filter(Boolean).join(' ');

    const name = p.Name || '';
    if (caseSizeMaterial) {
      p.Name = `${name} ${caseSizeMaterial}`.trim();
    }

    // Add GPS / GPS+Cellular from ConfigKey
    const ck = p.ConfigKey || '';
    if (ck.includes('gpscell')) {
      p.Name += ' GPS+Cellular';
    } else if (ck.includes('-gps') && !ck.includes('gpscell')) {
      p.Name += ' GPS';
    }
  }

  return products;
}

/**
 * Fetch all Apple Watch products from all regions.
 */
export async function getAllProducts() {
  return fetchAllProducts({
    productName: PRODUCT_NAME,
    discoverModelsFn: getModels,
    buildUrl,
    postProcess,
  });
}
