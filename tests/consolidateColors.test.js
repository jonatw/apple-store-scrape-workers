/**
 * Color consolidation tests.
 * Mirrors Python TestColorConsolidation.
 */
import { describe, it, expect } from 'vitest';
import { extractColors, cleanProductName, makeGroupingKey, consolidateColors } from '../src/processor/consolidateColors';

describe('extractColors', () => {
  it('should extract single-word colors', () => {
    const colors = extractColors('iPhone 16 Pro Black Titanium');
    expect(colors).toContain('black');
    expect(colors).toContain('titanium');
  });

  it('should extract multi-word colors', () => {
    const colors = extractColors('iPhone 16 Pro Rose Gold');
    expect(colors).toContain('rose gold');
  });

  it('should return empty for no colors', () => {
    expect(extractColors('MacBook Pro 14" M4')).toEqual([]);
  });

  it('should not extract ignored words', () => {
    const colors = extractColors('iPad Pro 128GB WiFi');
    expect(colors).not.toContain('pro');
    expect(colors).not.toContain('wifi');
  });

  it('should handle null/empty input', () => {
    expect(extractColors(null)).toEqual([]);
    expect(extractColors('')).toEqual([]);
  });
});

describe('cleanProductName', () => {
  it('should remove color words from product name', () => {
    const cleaned = cleanProductName('iPhone 16 Pro Black Titanium');
    expect(cleaned.toLowerCase()).not.toContain('black');
    expect(cleaned.toLowerCase()).not.toContain('titanium');
    expect(cleaned).toContain('iPhone');
  });

  it('should remove multi-word colors', () => {
    const cleaned = cleanProductName('iPhone 16 Space Gray');
    expect(cleaned.toLowerCase()).not.toContain('space gray');
  });

  it('should collapse whitespace after removal', () => {
    const cleaned = cleanProductName('iPhone 16 Black 128GB');
    expect(cleaned).not.toContain('  ');
  });

  it('should handle empty input', () => {
    expect(cleanProductName('')).toBe('');
    expect(cleanProductName(null)).toBe('');
  });
});

describe('makeGroupingKey', () => {
  it('should group by cleaned name + price for non-Mac products', () => {
    const key1 = makeGroupingKey({ PRODUCT_NAME: 'iPhone 16 Black', Price_US: 999 }, 'iphone');
    const key2 = makeGroupingKey({ PRODUCT_NAME: 'iPhone 16 Blue', Price_US: 999 }, 'iphone');
    // Same base name + price → same key
    expect(key1).toBe(key2);
  });

  it('should NOT group different prices together', () => {
    const key1 = makeGroupingKey({ PRODUCT_NAME: 'iPhone 16 Black 128GB', Price_US: 799 }, 'iphone');
    const key2 = makeGroupingKey({ PRODUCT_NAME: 'iPhone 16 Black 256GB', Price_US: 899 }, 'iphone');
    expect(key1).not.toBe(key2);
  });

  it('should group Mac by specs for Mac products', () => {
    const key = makeGroupingKey(
      { PRODUCT_NAME: 'Mac mini Silver', Price_US: 599, Chip: 'M4', Memory: '16GB', Storage: '256GB' },
      'mac'
    );
    expect(key).toContain('M4');
    expect(key).toContain('16GB');
    expect(key).toContain('256GB');
  });
});

describe('consolidateColors', () => {
  it('should merge color variants into single rows', () => {
    const products = [
      { PRODUCT_NAME: 'iPhone 16 Black 128GB', Price_US: 799, Price_TW: 25900, SKU: 'A1' },
      { PRODUCT_NAME: 'iPhone 16 Blue 128GB', Price_US: 799, Price_TW: 25900, SKU: 'A2' },
      { PRODUCT_NAME: 'iPhone 16 Green 128GB', Price_US: 799, Price_TW: 25900, SKU: 'A3' },
    ];

    const result = consolidateColors(products, 'iphone');

    expect(result).toHaveLength(1);
    expect(result[0].Color_Variants).toBe(3);
    expect(result[0].Available_Colors).toContain('black');
    expect(result[0].Available_Colors).toContain('blue');
    expect(result[0].Available_Colors).toContain('green');
  });

  it('should NOT merge products with different prices', () => {
    const products = [
      { PRODUCT_NAME: 'iPhone 16 Black 128GB', Price_US: 799, Price_TW: 25900, SKU: 'A1' },
      { PRODUCT_NAME: 'iPhone 16 Black 256GB', Price_US: 899, Price_TW: 29900, SKU: 'A2' },
    ];

    const result = consolidateColors(products, 'iphone');

    expect(result).toHaveLength(2);
  });

  it('should handle empty input', () => {
    expect(consolidateColors([], 'iphone')).toEqual([]);
  });

  it('should set Single Option when no colors found', () => {
    const products = [
      { PRODUCT_NAME: 'AirPods Pro 3', Price_US: 249, Price_TW: 7490, SKU: 'AP1' },
    ];

    const result = consolidateColors(products, 'airpods');

    expect(result).toHaveLength(1);
    expect(result[0].Available_Colors).toBe('Single Option');
  });
});
