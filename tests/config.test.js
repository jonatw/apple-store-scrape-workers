/**
 * Configuration validation tests.
 * Mirrors Python TestSharedConfiguration.
 */
import { describe, it, expect } from 'vitest';
import {
  REGIONS, REFERENCE_REGION,
  DEFAULT_IPHONE_MODELS, DEFAULT_IPAD_MODELS, DEFAULT_MAC_MODELS,
  DEFAULT_WATCH_MODELS, DEFAULT_AIRPODS_MODELS, DEFAULT_TV_MODELS, DEFAULT_HOMEPOD_MODELS,
  KV_KEYS, REQUEST_DELAY, DEFAULT_EXCHANGE_RATE, API_PREFIX,
} from '../src/config';

describe('REGIONS configuration', () => {
  it('should have at least 2 regions', () => {
    expect(Object.keys(REGIONS).length).toBeGreaterThanOrEqual(2);
  });

  it('each region should have 4 fields [display, currency, locale, symbol]', () => {
    for (const [code, info] of Object.entries(REGIONS)) {
      expect(info).toHaveLength(4);
      expect(typeof info[0]).toBe('string'); // display name
      expect(typeof info[1]).toBe('string'); // currency code
      expect(typeof info[2]).toBe('string'); // locale
      expect(typeof info[3]).toBe('string'); // currency symbol
    }
  });

  it('should have US as the first (reference) region', () => {
    const firstKey = Object.keys(REGIONS)[0];
    expect(firstKey).toBe('');
    expect(REGIONS[''][0]).toBe('US');
  });

  it('should have TW as a region', () => {
    expect(REGIONS).toHaveProperty('tw');
    expect(REGIONS['tw'][0]).toBe('TW');
  });
});

describe('REFERENCE_REGION', () => {
  it('should be the first key in REGIONS', () => {
    expect(REFERENCE_REGION).toBe(Object.keys(REGIONS)[0]);
  });
});

describe('Default model lists', () => {
  it('DEFAULT_IPHONE_MODELS should be non-empty', () => {
    expect(DEFAULT_IPHONE_MODELS.length).toBeGreaterThan(0);
  });

  it('DEFAULT_IPAD_MODELS should be non-empty', () => {
    expect(DEFAULT_IPAD_MODELS.length).toBeGreaterThan(0);
  });

  it('DEFAULT_MAC_MODELS should be non-empty', () => {
    expect(DEFAULT_MAC_MODELS.length).toBeGreaterThan(0);
  });

  it('DEFAULT_WATCH_MODELS should be non-empty', () => {
    expect(DEFAULT_WATCH_MODELS.length).toBeGreaterThan(0);
  });

  it('DEFAULT_AIRPODS_MODELS should be non-empty', () => {
    expect(DEFAULT_AIRPODS_MODELS.length).toBeGreaterThan(0);
  });

  it('DEFAULT_TV_MODELS should be non-empty', () => {
    expect(DEFAULT_TV_MODELS.length).toBeGreaterThan(0);
  });

  it('DEFAULT_HOMEPOD_MODELS should be non-empty', () => {
    expect(DEFAULT_HOMEPOD_MODELS.length).toBeGreaterThan(0);
  });
});

describe('KV_KEYS', () => {
  it('should have keys for all product types', () => {
    expect(KV_KEYS).toHaveProperty('IPHONE_DATA');
    expect(KV_KEYS).toHaveProperty('IPAD_DATA');
    expect(KV_KEYS).toHaveProperty('MAC_DATA');
    expect(KV_KEYS).toHaveProperty('WATCH_DATA');
    expect(KV_KEYS).toHaveProperty('AIRPODS_DATA');
    expect(KV_KEYS).toHaveProperty('TVHOME_DATA');
    expect(KV_KEYS).toHaveProperty('EXCHANGE_RATE');
    expect(KV_KEYS).toHaveProperty('LAST_UPDATED');
  });
});

describe('Constants', () => {
  it('REQUEST_DELAY should be positive', () => {
    expect(REQUEST_DELAY).toBeGreaterThan(0);
  });

  it('DEFAULT_EXCHANGE_RATE should be reasonable', () => {
    expect(DEFAULT_EXCHANGE_RATE).toBeGreaterThan(20);
    expect(DEFAULT_EXCHANGE_RATE).toBeLessThan(50);
  });

  it('API_PREFIX should start with /', () => {
    expect(API_PREFIX).toMatch(/^\//);
  });
});
