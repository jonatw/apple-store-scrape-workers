/**
 * Price difference calculation tests.
 * TWD-based comparison: converts USD → TWD, then compares with TW price.
 */
import { describe, it, expect } from 'vitest';
import { calculatePriceDifferences, calculatePriceDifferencesWithFee } from '../src/processor/calculate';

describe('calculatePriceDifferences', () => {
  it('should return empty array for empty input', () => {
    expect(calculatePriceDifferences([], 31.5)).toEqual([]);
    expect(calculatePriceDifferences(null, 31.5)).toEqual([]);
  });

  it('should calculate TWD-based price difference percentage', () => {
    // US $999 * 31.5 = NT$31,468.5 → TW NT$31,900
    // diff = (31900 - 31468.5) / 31468.5 * 100 = +1.4%
    const products = [{ Price_US: 999, Price_TW: 31900, PRODUCT_NAME: 'Test' }];
    const result = calculatePriceDifferences(products, 31.5);

    expect(result).toHaveLength(1);
    expect(typeof result[0].price_difference_percent).toBe('number');
    expect(result[0].price_difference_twd).toBeDefined();
    expect(result[0].Price_US_TWD).toBe(31469); // rounded
    expect(result[0].price_difference_percent).toBeCloseTo(1.4, 0);
  });

  it('should recommend US when TW is more expensive (>2%)', () => {
    // US $999 * 31.5 = NT$31,468.5 → TW NT$40,000
    // diff = (40000 - 31468.5) / 31468.5 * 100 = +27.1%
    const products = [{ Price_US: 999, Price_TW: 40000, PRODUCT_NAME: 'Test' }];
    const result = calculatePriceDifferences(products, 31.5);

    expect(result[0].recommendation).toBe('US');
    expect(result[0].price_difference_percent).toBeGreaterThan(2);
  });

  it('should recommend TW when TW is cheaper (<-2%)', () => {
    // US $999 * 31.5 = NT$31,468.5 → TW NT$25,000
    // diff = (25000 - 31468.5) / 31468.5 * 100 = -20.6%
    const products = [{ Price_US: 999, Price_TW: 25000, PRODUCT_NAME: 'Test' }];
    const result = calculatePriceDifferences(products, 31.5);

    expect(result[0].recommendation).toBe('TW');
    expect(result[0].price_difference_percent).toBeLessThan(-2);
  });

  it('should recommend SIMILAR when prices are close', () => {
    // US $999 * 31.5 = NT$31,468.5 → TW = same
    const products = [{ Price_US: 999, Price_TW: 31468.5, PRODUCT_NAME: 'Test' }];
    const result = calculatePriceDifferences(products, 31.5);

    expect(result[0].recommendation).toBe('SIMILAR');
  });

  it('should use default exchange rate when not provided', () => {
    const products = [{ Price_US: 999, Price_TW: 31900, PRODUCT_NAME: 'Test' }];
    const result = calculatePriceDifferences(products, 0);

    expect(result).toHaveLength(1);
    expect(typeof result[0].price_difference_percent).toBe('number');
  });
});

describe('calculatePriceDifferencesWithFee', () => {
  it('should include foreign transaction fee in TWD calculation', () => {
    // Without fee: US $1000 * 31.5 = NT$31,500 → TW NT$31,500 → 0% diff
    // With 1.5% fee: US $1000 * 1.015 * 31.5 = NT$31,972.5 → TW NT$31,500
    // diff with fee = (31500 - 31972.5) / 31972.5 * 100 = -1.5% (TW is cheaper with fee)
    const products = [{ Price_US: 1000, Price_TW: 31500, PRODUCT_NAME: 'Test' }];
    const noFee = calculatePriceDifferences(products, 31.5);
    const withFee = calculatePriceDifferencesWithFee(products, 31.5, 1.5);

    // With fee, US effective price is higher, making TW look relatively cheaper
    expect(withFee[0].price_difference_percent_with_fee).toBeLessThan(noFee[0].price_difference_percent);
    expect(withFee[0].Price_US_with_fee_TWD).toBe(Math.round(1000 * 1.015 * 31.5));
  });

  it('should use 2% threshold for recommendation with fee', () => {
    // US $1000 * 1.015 * 31.5 = NT$31,972.5
    // TW = NT$35,000 → diff = +9.5% → recommend US
    const products = [{ Price_US: 1000, Price_TW: 35000, PRODUCT_NAME: 'Test' }];
    const result = calculatePriceDifferencesWithFee(products, 31.5, 1.5);

    expect(result[0].recommendation_with_fee).toBe('US');
  });
});
