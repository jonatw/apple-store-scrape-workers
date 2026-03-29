/**
 * Price difference calculation tests.
 */
import { describe, it, expect } from 'vitest';
import { calculatePriceDifferences, calculatePriceDifferencesWithFee } from '../src/processor/calculate';

describe('calculatePriceDifferences', () => {
  it('should return empty array for empty input', () => {
    expect(calculatePriceDifferences([], 31.5)).toEqual([]);
    expect(calculatePriceDifferences(null, 31.5)).toEqual([]);
  });

  it('should calculate price difference percentage', () => {
    const products = [{ Price_US: 999, Price_TW: 31900, PRODUCT_NAME: 'Test' }];
    const result = calculatePriceDifferences(products, 31.5);

    expect(result).toHaveLength(1);
    expect(typeof result[0].price_difference_percent).toBe('number');
    expect(typeof result[0].price_difference_usd).toBe('number');
  });

  it('should recommend US when TW is significantly more expensive', () => {
    // TW price = 40000 / 31.5 = ~1269.84 USD, vs US $999 → TW is 27% more expensive
    const products = [{ Price_US: 999, Price_TW: 40000, PRODUCT_NAME: 'Test' }];
    const result = calculatePriceDifferences(products, 31.5);

    expect(result[0].recommendation).toBe('US');
    expect(result[0].price_difference_percent).toBeGreaterThan(5);
  });

  it('should recommend TW when TW is significantly cheaper', () => {
    // TW price = 25000 / 31.5 = ~793.65 USD, vs US $999 → TW is 20% cheaper
    const products = [{ Price_US: 999, Price_TW: 25000, PRODUCT_NAME: 'Test' }];
    const result = calculatePriceDifferences(products, 31.5);

    expect(result[0].recommendation).toBe('TW');
    expect(result[0].price_difference_percent).toBeLessThan(-5);
  });

  it('should recommend NEUTRAL when prices are similar', () => {
    // TW price = 31468.5 / 31.5 = 999 USD → exactly equal
    const products = [{ Price_US: 999, Price_TW: 31468.5, PRODUCT_NAME: 'Test' }];
    const result = calculatePriceDifferences(products, 31.5);

    expect(result[0].recommendation).toBe('NEUTRAL');
  });

  it('should use default exchange rate if not provided', () => {
    const products = [{ Price_US: 999, Price_TW: 31900, PRODUCT_NAME: 'Test' }];
    const result = calculatePriceDifferences(products, 0);

    expect(result).toHaveLength(1);
    expect(typeof result[0].price_difference_percent).toBe('number');
  });
});

describe('calculatePriceDifferencesWithFee', () => {
  it('should include foreign transaction fee in calculation', () => {
    const products = [{ Price_US: 1000, Price_TW: 31500, PRODUCT_NAME: 'Test' }];
    const noFee = calculatePriceDifferences(products, 31.5);
    const withFee = calculatePriceDifferencesWithFee([{ ...products[0] }], 31.5, 1.5);

    // With fee, US price is effectively higher, so TW looks comparatively cheaper
    expect(withFee[0].price_difference_percent_with_fee).toBeLessThan(noFee[0].price_difference_percent);
  });
});
