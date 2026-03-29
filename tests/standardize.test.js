/**
 * Product name standardization tests.
 */
import { describe, it, expect } from 'vitest';
import { standardizeProductName } from '../src/processor/standardize';

describe('standardizeProductName', () => {
  it('should lowercase and normalize spaces', () => {
    expect(standardizeProductName('iPhone 16 Pro')).toBe('iphone_16_pro');
  });

  it('should handle non-breaking spaces (U+00A0)', () => {
    expect(standardizeProductName('iPhone\u00a016 Pro')).toBe('iphone_16_pro');
  });

  it('should remove trademark symbols', () => {
    expect(standardizeProductName('Apple Watch™')).toBe('apple_watch');
  });

  it('should strip special characters', () => {
    expect(standardizeProductName('MacBook Pro (14")')).toBe('macbook_pro_14');
  });

  it('should return empty string for empty input', () => {
    expect(standardizeProductName('')).toBe('');
    expect(standardizeProductName(null)).toBe('');
    expect(standardizeProductName(undefined)).toBe('');
  });

  it('should collapse multiple underscores', () => {
    expect(standardizeProductName('iPhone  16   Pro')).toBe('iphone_16_pro');
  });
});
