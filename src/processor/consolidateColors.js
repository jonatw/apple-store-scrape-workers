/**
 * Color consolidation — merges products that differ only by color.
 *
 * Port of Python smart_consolidate_colors.py.
 * Groups products by (cleaned base name, price) and merges color variants
 * into a single row with Available_Colors and Color_Variants columns.
 */

// ==================== COLOR DICTIONARY ====================

export const KNOWN_COLORS = new Set([
  // Basic colors
  'black', 'blue', 'green', 'pink', 'yellow', 'red', 'white', 'purple',
  'orange', 'gray', 'grey', 'silver', 'gold', 'brown', 'teal', 'indigo',
  'violet', 'lime', 'cyan', 'magenta',
  // Apple-specific colors
  'space gray', 'space grey', 'rose gold', 'midnight', 'starlight',
  'deep purple', 'alpine', 'sierra', 'graphite', 'jet',
  'coral', 'lavender', 'natural', 'cream', 'denim',
  'sage', 'plum', 'bronze', 'titanium',
  'light blue', 'stone', 'cosmic', 'deep', 'ultramarine',
  'desert', 'evergreen', 'citrus', 'berry',
]);

// Words that look like colors but are part of product identity
const IGNORED_WORDS = new Set([
  'gb', 'tb', 'inch', 'wifi', 'cellular', 'chip',
  'fi', 'wi', 'mini', 'plus', 'max', 'pro', 'air', 'se', 'ultra',
]);

// ==================== COLOR EXTRACTION ====================

/**
 * Extract color words from a product name.
 * @param {string} productName
 * @returns {string[]} List of color names found
 */
export function extractColors(productName) {
  if (!productName || typeof productName !== 'string') return [];
  const nameLower = productName.toLowerCase();
  const colors = [];

  // Multi-word colors first (longest match)
  const multiWord = [...KNOWN_COLORS].filter(c => c.includes(' ')).sort((a, b) => b.length - a.length);
  let remaining = nameLower;
  for (const color of multiWord) {
    if (remaining.includes(color)) {
      colors.push(color);
      remaining = remaining.replace(color, ' ');
    }
  }

  // Single-word colors from remaining words
  for (const word of remaining.split(/\s+/)) {
    const clean = word.replace(/[^a-z]/g, '');
    if (clean && KNOWN_COLORS.has(clean) && !IGNORED_WORDS.has(clean)) {
      colors.push(clean);
    }
  }

  return colors;
}

/**
 * Remove color words from a product name.
 * @param {string} name
 * @returns {string} Cleaned name
 */
export function cleanProductName(name) {
  if (!name || typeof name !== 'string') return '';
  let clean = name;

  // Remove colors, longest first to handle multi-word colors
  const sortedColors = [...KNOWN_COLORS].sort((a, b) => b.length - a.length);
  for (const color of sortedColors) {
    clean = clean.replace(new RegExp(color.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ');
  }

  // Clean punctuation artifacts
  clean = clean.replace(/\s*-\s*$/, '');       // trailing dash
  clean = clean.replace(/-/g, ' ');             // internal dashes to space
  clean = clean.replace(/,\s*$/, '');           // trailing comma
  clean = clean.replace(/\s+/g, ' ').trim();   // collapse whitespace

  return clean;
}

// ==================== GROUPING ====================

/**
 * Create a grouping key for color consolidation.
 * Products with the same key are color variants of each other.
 * @param {Object} product
 * @param {string} productType - 'mac', 'iphone', etc.
 * @returns {string} Grouping key
 */
export function makeGroupingKey(product, productType) {
  const name = product.PRODUCT_NAME || '';
  const baseName = cleanProductName(name);
  const price = product.Price_US || 0;

  if (productType === 'mac') {
    // Mac: group by specs (chip, memory, storage, price)
    const chip = product.Chip || '';
    const memory = product.Memory || '';
    const storage = product.Storage || '';
    return `${chip}|${memory}|${storage}|${price}`;
  }

  // Default: group by cleaned base name + price
  return `${baseName}|${price}`;
}

// ==================== CONSOLIDATION ====================

/**
 * Consolidate products by merging color variants into single rows.
 * @param {Object[]} products - Merged products (with PRODUCT_NAME, Price_*, SKU)
 * @param {string} productType - Product type (e.g. 'iphone', 'mac')
 * @returns {Object[]} Consolidated products
 */
export function consolidateColors(products, productType) {
  if (!Array.isArray(products) || products.length === 0) return [];

  // Group by key
  const groups = {};
  for (const product of products) {
    const key = makeGroupingKey(product, productType);
    if (!groups[key]) groups[key] = [];
    groups[key].push(product);
  }

  const consolidated = [];
  for (const items of Object.values(groups)) {
    // Use the first item as the base
    const base = { ...items[0] };

    // Collect colors from all variants
    const allColors = [];
    for (const item of items) {
      allColors.push(...extractColors(item.PRODUCT_NAME || ''));
    }
    const uniqueColors = [...new Set(allColors)].sort();

    // Clean the product name (remove color words) — except for Mac where names include specs
    if (productType !== 'mac') {
      base.PRODUCT_NAME = cleanProductName(base.PRODUCT_NAME || '');
    }

    base.Available_Colors = uniqueColors.length > 0 ? uniqueColors.join(', ') : 'Single Option';
    base.Color_Variants = items.length;

    // Collect all SKU variants
    const skuVariants = [...new Set(items.map(i => i.SKU).filter(Boolean))].sort();
    base.SKU_Variants = skuVariants.join(', ');

    consolidated.push(base);
  }

  return consolidated;
}
