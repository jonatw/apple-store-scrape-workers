/**
 * Cross-region product data merging.
 *
 * Merges product data from multiple regions using either:
 * - Name-based matching (metrics products: iPhone, iPad, TV/Home)
 * - ConfigKey-based matching (bootstrap products: Mac, Watch, AirPods)
 *
 * The merge key is auto-selected: ConfigKey when all products have one,
 * Name otherwise. Port of Python scraper_base.merge_product_data().
 */

import { REGIONS, REFERENCE_REGION } from '../config';

/**
 * Merge product data from all regions.
 * @param {Object[]} products - Flat array of products from all regions
 * @param {string[]} [extraColumns] - Additional columns to preserve (e.g. ['Chip', 'Memory'])
 * @returns {Object[]} Merged products with region-specific price/SKU columns
 */
export function mergeProductData(products, extraColumns = null) {
  if (!Array.isArray(products) || products.length === 0) return [];

  try {
    // Normalize whitespace in Name (Apple uses U+00A0 on some regional pages)
    for (const p of products) {
      if (p.Name) p.Name = p.Name.replace(/\u00a0/g, ' ').trim();
    }

    // Remove _bootstrap_product helper if present
    for (const p of products) {
      delete p._bootstrap_product;
    }

    // Choose merge key: ConfigKey when all products have one, Name otherwise
    const hasConfigKey = products.every(p => p.ConfigKey && p.ConfigKey !== '');
    const mergeKey = hasConfigKey ? 'ConfigKey' : 'Name';
    console.log(`  Merge key: ${mergeKey}`);

    // Group by region
    const regionDfs = {};
    for (const [regionCode, regionInfo] of Object.entries(REGIONS)) {
      const regionDisplay = regionInfo[0];
      const regionProducts = products.filter(p => p.Region_Code === regionCode);

      // Deduplicate by merge key
      const seen = new Set();
      const deduped = [];
      for (const p of regionProducts) {
        const key = p[mergeKey];
        if (key && !seen.has(key)) {
          seen.add(key);
          deduped.push(p);
        }
      }
      regionDfs[regionCode] = deduped;
    }

    const refRegion = REFERENCE_REGION;
    const refDisplay = REGIONS[refRegion][0];

    if (!regionDfs[refRegion] || regionDfs[refRegion].length === 0) {
      console.error(`  Reference region ${refDisplay} has no data!`);
      return [];
    }

    // Build merged products starting from reference region
    const mergedMap = new Map(); // mergeKey value → merged product

    // Start with reference region
    for (const p of regionDfs[refRegion]) {
      const key = p[mergeKey];
      if (!key) continue;

      const merged = {
        SKU: p.SKU || '',
        PRODUCT_NAME: mergeKey === 'ConfigKey' ? (p.Name || key) : key,
        [`Price_${refDisplay}`]: p.Price ?? 0,
      };

      // Preserve extra columns from reference region
      if (extraColumns) {
        for (const col of extraColumns) {
          if (p[col] !== undefined) merged[col] = p[col];
        }
      }

      mergedMap.set(key, merged);
    }

    // Merge other regions
    for (const [regionCode, regionProducts] of Object.entries(regionDfs)) {
      if (regionCode === refRegion) continue;
      const regionDisplay = REGIONS[regionCode][0];

      for (const p of regionProducts) {
        const key = p[mergeKey];
        if (!key) continue;

        if (mergedMap.has(key)) {
          // Product exists in reference region — add this region's price
          mergedMap.get(key)[`Price_${regionDisplay}`] = p.Price ?? 0;
        } else {
          // Orphan: only exists in this region
          const merged = {
            SKU: p.SKU || '',
            PRODUCT_NAME: mergeKey === 'ConfigKey' ? (p.Name || key) : key,
            [`Price_${refDisplay}`]: 0, // Missing from reference region
            [`Price_${regionDisplay}`]: p.Price ?? 0,
          };
          mergedMap.set(key, merged);
        }
      }
    }

    // Fill missing region prices with 0
    const result = [...mergedMap.values()];
    for (const product of result) {
      for (const [, regionInfo] of Object.entries(REGIONS)) {
        const priceCol = `Price_${regionInfo[0]}`;
        if (product[priceCol] === undefined) product[priceCol] = 0;
      }
    }

    // Report alignment
    reportAlignment(result);

    console.log(`  Merged ${result.length} products successfully.`);
    return result;
  } catch (error) {
    console.error('Error merging product data:', error);
    return [];
  }
}

/**
 * Report cross-region alignment stats. Only prints details when there are orphans.
 */
function reportAlignment(products) {
  if (products.length === 0) return;

  const priceCols = Object.values(REGIONS).map(r => `Price_${r[0]}`);
  if (priceCols.length < 2) return;

  const total = products.length;
  const aligned = products.filter(p => priceCols.every(col => (p[col] || 0) > 0)).length;

  if (aligned < total) {
    console.warn(`  WARNING: ${total - aligned} orphan(s) out of ${total} products`);
    for (const col of priceCols) {
      const region = col.replace('Price_', '');
      const orphans = products.filter(p => !p[col] || p[col] === 0);
      for (const orphan of orphans.slice(0, 5)) {
        console.warn(`    Missing ${region}: ${orphan.PRODUCT_NAME || '?'}`);
      }
      if (orphans.length > 5) {
        console.warn(`    ... and ${orphans.length - 5} more`);
      }
    }
  }
}
