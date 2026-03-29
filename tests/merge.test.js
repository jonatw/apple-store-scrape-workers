/**
 * Merge logic tests.
 * Mirrors Python TestMergeProductData.
 */
import { describe, it, expect } from 'vitest';
import { mergeProductData } from '../src/processor/merge';

describe('mergeProductData', () => {
  it('should return empty array for empty input', () => {
    expect(mergeProductData([])).toEqual([]);
    expect(mergeProductData(null)).toEqual([]);
    expect(mergeProductData(undefined)).toEqual([]);
  });

  it('should merge products by Name (metrics strategy)', () => {
    const products = [
      { SKU: 'A1', Name: 'iPhone 16 Pro 128GB', Price: 999, Region: 'US', Region_Code: '' },
      { SKU: 'B1', Name: 'iPhone 16 Pro 128GB', Price: 31900, Region: 'TW', Region_Code: 'tw' },
      { SKU: 'A2', Name: 'iPhone 16 Pro 256GB', Price: 1099, Region: 'US', Region_Code: '' },
      { SKU: 'B2', Name: 'iPhone 16 Pro 256GB', Price: 35900, Region: 'TW', Region_Code: 'tw' },
    ];

    const merged = mergeProductData(products);

    expect(merged).toHaveLength(2);
    expect(merged[0].PRODUCT_NAME).toBe('iPhone 16 Pro 128GB');
    expect(merged[0].Price_US).toBe(999);
    expect(merged[0].Price_TW).toBe(31900);
    expect(merged[1].PRODUCT_NAME).toBe('iPhone 16 Pro 256GB');
    expect(merged[1].Price_US).toBe(1099);
    expect(merged[1].Price_TW).toBe(35900);
  });

  it('should merge products by ConfigKey (bootstrap strategy)', () => {
    const products = [
      { SKU: 'M1', Name: 'Mac mini', ConfigKey: 'm4-10-10', Price: 599, Region: 'US', Region_Code: '' },
      { SKU: 'M2', Name: 'Mac mini', ConfigKey: 'm4-10-10', Price: 18900, Region: 'TW', Region_Code: 'tw' },
      { SKU: 'M3', Name: 'Mac mini', ConfigKey: 'm4pro-14-20', Price: 1399, Region: 'US', Region_Code: '' },
      { SKU: 'M4', Name: 'Mac mini', ConfigKey: 'm4pro-14-20', Price: 44900, Region: 'TW', Region_Code: 'tw' },
    ];

    const merged = mergeProductData(products);

    expect(merged).toHaveLength(2);
    // ConfigKey merge should use Name for PRODUCT_NAME
    expect(merged[0].Price_US).toBe(599);
    expect(merged[0].Price_TW).toBe(18900);
    expect(merged[1].Price_US).toBe(1399);
    expect(merged[1].Price_TW).toBe(44900);
  });

  it('should detect orphans (products in only one region)', () => {
    const products = [
      { SKU: 'A1', Name: 'iPhone 16 Pro 128GB', Price: 999, Region: 'US', Region_Code: '' },
      { SKU: 'A2', Name: 'iPhone 16 Pro 256GB', Price: 1099, Region: 'US', Region_Code: '' },
      { SKU: 'B1', Name: 'iPhone 16 Pro 128GB', Price: 31900, Region: 'TW', Region_Code: 'tw' },
      // iPhone 16 Pro 256GB missing from TW → orphan
    ];

    const merged = mergeProductData(products);

    expect(merged).toHaveLength(2);
    const orphan = merged.find(p => p.PRODUCT_NAME === 'iPhone 16 Pro 256GB');
    expect(orphan).toBeDefined();
    expect(orphan.Price_TW).toBe(0); // Missing region gets 0
  });

  it('should preserve extra columns from reference region', () => {
    const products = [
      { SKU: 'M1', Name: 'Mac mini', ConfigKey: 'm4-10-10', Price: 599, Region: 'US', Region_Code: '', Chip: 'M4', Memory: '16GB' },
      { SKU: 'M2', Name: 'Mac mini', ConfigKey: 'm4-10-10', Price: 18900, Region: 'TW', Region_Code: 'tw' },
    ];

    const merged = mergeProductData(products, ['Chip', 'Memory']);

    expect(merged).toHaveLength(1);
    expect(merged[0].Chip).toBe('M4');
    expect(merged[0].Memory).toBe('16GB');
  });

  it('should normalize Unicode non-breaking spaces in Name', () => {
    const products = [
      { SKU: 'A1', Name: 'iPhone\u00a016 Pro', Price: 999, Region: 'US', Region_Code: '' },
      { SKU: 'B1', Name: 'iPhone 16 Pro', Price: 31900, Region: 'TW', Region_Code: 'tw' },
    ];

    const merged = mergeProductData(products);

    // Should merge despite U+00A0 vs regular space
    expect(merged).toHaveLength(1);
    expect(merged[0].Price_US).toBe(999);
    expect(merged[0].Price_TW).toBe(31900);
  });

  it('should deduplicate products within the same region', () => {
    const products = [
      { SKU: 'A1', Name: 'iPhone 16', Price: 799, Region: 'US', Region_Code: '' },
      { SKU: 'A1', Name: 'iPhone 16', Price: 799, Region: 'US', Region_Code: '' }, // duplicate
      { SKU: 'B1', Name: 'iPhone 16', Price: 25900, Region: 'TW', Region_Code: 'tw' },
    ];

    const merged = mergeProductData(products);
    expect(merged).toHaveLength(1);
  });
});
