/**
 * Product name standardization for cross-region matching.
 *
 * Produces a normalized key for matching identical products across regions.
 * This is only used as a fallback — the primary merge strategies use
 * Name (metrics products) or ConfigKey (bootstrap products) directly.
 */

/**
 * Normalize a product name for matching purposes.
 * Lowercases, strips special chars, normalizes whitespace.
 * @param {string} name - Raw product name
 * @returns {string} Normalized name
 */
export function standardizeProductName(name) {
  if (!name) return '';

  return name
    .replace(/\u00a0/g, ' ')    // Non-breaking space → regular space
    .replace(/[™®©]/g, '')       // Remove trademark symbols
    .toLowerCase()
    .replace(/\s+/g, '_')        // Spaces to underscores
    .replace(/[^a-z0-9_.-]/g, '') // Keep only alphanumeric, underscore, dot, dash
    .replace(/_+/g, '_')         // Collapse multiple underscores
    .replace(/^_|_$/g, '');      // Trim leading/trailing underscores
}
