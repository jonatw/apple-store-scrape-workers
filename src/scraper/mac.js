/**
 * Mac scraper — fetches Mac product data from Apple Store across regions.
 *
 * Mac products use bootstrap extraction strategy and include spec columns
 * (Chip, CPU_Cores, GPU_Cores, etc.) parsed from ConfigKey.
 * Port of Python mac.py.
 */

import { DEFAULT_MAC_MODELS } from '../config';
import { discoverModels, fetchAllProducts } from './base';

const PRODUCT_NAME = 'Mac';

// Extra columns preserved through merge
export const MAC_EXTRA_COLUMNS = ['Chip', 'CPU_Cores', 'GPU_Cores', 'Neural_Engine', 'Memory', 'Storage'];

// Slugs that appear in /shop/buy-mac/ links but are not Mac computers
const NON_PRODUCT_SLUGS = new Set([
  'compare', 'accessories', 'help', 'financing',
  'studio-display', 'studio-display-xdr', 'pro-display-xdr',
]);

async function getModels() {
  const url = 'https://www.apple.com/shop/buy-mac';
  const models = await discoverModels('', url, '/shop/buy-mac/', DEFAULT_MAC_MODELS);
  return models.filter(m =>
    !NON_PRODUCT_SLUGS.has(m) &&
    !m.includes('display') &&
    !m.includes('accessories') &&
    !m.includes('compare') &&
    !m.includes('help')
  );
}

function buildUrl(model, regionCode) {
  const prefix = regionCode ? `/${regionCode}` : '';
  return `https://www.apple.com${prefix}/shop/buy-mac/${model}`;
}

// ==================== MAC-SPECIFIC SPEC EXTRACTION ====================

/**
 * Post-process Mac products: enrich with spec data parsed from ConfigKey.
 * ConfigKey formats vary by product:
 *   Mac mini:    "m4-10-10", "m4pro-14-20"
 *   MacBook Pro: "14inch-silver-standard-m5pro-18-20"
 *   Mac Studio:  "m3ultra-28-60", "m4max-16-40"
 *   MacBook Air: "13inch-midnight-10-8"
 *   iMac:        "green-10-10"
 */
function postProcess(products, html) {
  const emptySpecs = { Chip: '', CPU_Cores: '', GPU_Cores: '', Neural_Engine: '', Memory: '', Storage: '' };

  for (const p of products) {
    // Initialize with empty specs
    Object.assign(p, { ...emptySpecs, ...p });

    const ck = p.ConfigKey || '';
    if (!ck) continue;

    // Extract chip name (m4, m5pro, m3ultra, etc.)
    const chipMatch = ck.match(/(m\d+(?:pro|max|ultra)?)/i);
    if (chipMatch) {
      const raw = chipMatch[1].toUpperCase();
      // "M4PRO" → "M4 Pro", "M3ULTRA" → "M3 Ultra"
      p.Chip = raw.replace(/(M\d+)(PRO|MAX|ULTRA)/i, (_, base, suffix) =>
        `${base} ${suffix.charAt(0).toUpperCase()}${suffix.slice(1).toLowerCase()}`
      );
    }

    // Extract CPU/GPU core counts (two numbers like -18-20 or -10-10)
    const coreMatch = ck.match(/(\d+)-(\d+)(?:$|-)/);
    if (coreMatch && !p.CPU_Cores) {
      p.CPU_Cores = coreMatch[1];
      p.GPU_Cores = coreMatch[2];
    }

    // Extract storage from ConfigKey (e.g. "256gb", "512gb", "1tb")
    const storageMatch = ck.match(/(\d+)(gb|tb)/i);
    if (storageMatch && !p.Storage) {
      p.Storage = `${storageMatch[1]}${storageMatch[2].toUpperCase()}`;
    }

    // Screen size: "13inch", "14inch", "15inch", "16inch"
    const sizeMatch = ck.match(/(\d+)inch/);
    if (sizeMatch) p._screen_size = `${sizeMatch[1]}"`;

    // Finish type: nano_texture vs standard
    if (ck.includes('nano_texture') || ck.includes('nano-texture')) p._finish = 'Nano-texture';

    // Form factor for Mac Pro
    if (ck.includes('rackmount')) p._form = 'Rack';
    else if (ck.includes('wheels')) p._form = 'Wheels';

    // Build descriptive name
    const parts = [p.Name];
    if (p._screen_size) parts.push(p._screen_size);

    if (p.Chip) {
      let chipStr = p.Chip;
      if (p.CPU_Cores && p.GPU_Cores) chipStr += ` ${p.CPU_Cores}/${p.GPU_Cores}-core`;
      parts.push(chipStr);
    } else if (p.CPU_Cores && p.GPU_Cores) {
      parts.push(`${p.CPU_Cores}/${p.GPU_Cores}-core`);
    }

    if (p.Memory) parts.push(p.Memory);
    if (p.Storage) parts.push(p.Storage);
    if (p._finish) parts.push(p._finish);
    if (p._form) parts.push(p._form);

    if (parts.length > 1) p.Name = parts.join(' ');

    // Clean up temporary fields
    delete p._screen_size;
    delete p._finish;
    delete p._form;
  }

  return products;
}

/**
 * Fetch all Mac products from all regions.
 */
export async function getAllProducts() {
  return fetchAllProducts({
    productName: PRODUCT_NAME,
    discoverModelsFn: getModels,
    buildUrl,
    postProcess,
  });
}
