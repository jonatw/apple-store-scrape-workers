/**
 * Scraper base framework tests.
 * Tests extraction strategies with mock HTML.
 */
import { describe, it, expect } from 'vitest';
import { stripRegionSuffix, extractProductsFromMetrics, extractProductsFromBootstrap } from '../src/scraper/base';

describe('stripRegionSuffix', () => {
  it('should strip US region suffix', () => {
    expect(stripRegionSuffix('MYW23LL/A')).toBe('MYW23');
  });

  it('should strip TW region suffix', () => {
    expect(stripRegionSuffix('MYW23FE/A')).toBe('MYW23');
  });

  it('should strip single-letter suffix', () => {
    expect(stripRegionSuffix('MYW23/A')).toBe('MYW23');
  });

  it('should leave base SKU unchanged', () => {
    expect(stripRegionSuffix('MYW23')).toBe('MYW23');
  });

  it('should handle null/empty input', () => {
    expect(stripRegionSuffix(null)).toBeNull();
    expect(stripRegionSuffix('')).toBe('');
  });
});

describe('extractProductsFromMetrics', () => {
  it('should extract products from metrics JSON', () => {
    const html = `
      <html>
      <script id="metrics" type="application/json">
        {
          "data": {
            "products": [
              {"sku": "IPHONE16PRO", "partNumber": "MYW23LL/A", "name": "iPhone 16 Pro 128GB", "price": {"fullPrice": 999}},
              {"sku": "IPHONE16PRO2", "partNumber": "MYW24LL/A", "name": "iPhone 16 Pro 256GB", "price": {"fullPrice": 1099}}
            ]
          }
        }
      </script>
      </html>
    `;

    const products = extractProductsFromMetrics(html, '');

    expect(products).toHaveLength(2);
    expect(products[0].Name).toBe('iPhone 16 Pro 128GB');
    expect(products[0].Price).toBe(999);
    expect(products[0].Region).toBe('US');
    expect(products[0].SKU).toBe('MYW23'); // region suffix stripped
  });

  it('should return empty array when no metrics script found', () => {
    const html = '<html><body>No metrics here</body></html>';
    expect(extractProductsFromMetrics(html, '')).toEqual([]);
  });

  it('should normalize non-breaking spaces in names', () => {
    const html = `
      <script id="metrics" type="application/json">
        {"data": {"products": [{"name": "iPhone\u00a016 Pro", "price": {"fullPrice": 999}}]}}
      </script>
    `;

    const products = extractProductsFromMetrics(html, '');
    expect(products[0].Name).toBe('iPhone 16 Pro');
  });
});

describe('extractProductsFromBootstrap', () => {
  it('should extract products from bootstrap data', () => {
    const html = `
      <html>
      <title>Buy Mac mini - Apple</title>
      <script>
        window.PRODUCT_SELECTION_BOOTSTRAP = {
          productSelectionData: {
            "products": [
              {"partNumber": "MXK23LL/A", "priceKey": "m4-10-10", "familyType": "Mac mini"}
            ],
            "displayValues": {
              "prices": {
                "m4-10-10": {"currentPrice": {"raw_amount": "599"}}
              }
            }
          }
        };
      </script>
      </html>
    `;

    const products = extractProductsFromBootstrap(html, '');

    expect(products).toHaveLength(1);
    expect(products[0].Name).toBe('Mac mini');
    expect(products[0].ConfigKey).toBe('m4-10-10');
    expect(products[0].Price).toBe(599);
  });

  it('should use fallback name from page title', () => {
    const html = `
      <html>
      <title>Buy AirPods Pro 3 - Apple</title>
      <script>
        window.PRODUCT_SELECTION_BOOTSTRAP = {
          productSelectionData: {
            "products": [
              {"partNumber": "MTJV3LL/A", "priceKey": "standard"}
            ],
            "displayValues": {
              "prices": {
                "standard": {"currentPrice": {"raw_amount": "249"}}
              }
            }
          }
        };
      </script>
      </html>
    `;

    const products = extractProductsFromBootstrap(html, '');

    // familyType not set or lowercase → should use page title fallback
    expect(products[0].Name).toBe('AirPods Pro 3');
  });

  it('should return empty array when no bootstrap found', () => {
    const html = '<html><body>No bootstrap here</body></html>';
    expect(extractProductsFromBootstrap(html, '')).toEqual([]);
  });

  it('should check mainDisplayValues.prices as fallback', () => {
    const html = `
      <html>
      <title>Buy Apple Watch - Apple</title>
      <script>
        window.PRODUCT_SELECTION_BOOTSTRAP = {
          productSelectionData: {
            "products": [
              {"partNumber": "MWP23LL/A", "priceKey": "42mm-gps", "familyType": "Apple Watch"}
            ],
            "mainDisplayValues": {
              "prices": {
                "42mm-gps": {"currentPrice": {"raw_amount": "399"}}
              }
            }
          }
        };
      </script>
      </html>
    `;

    const products = extractProductsFromBootstrap(html, '');

    expect(products).toHaveLength(1);
    expect(products[0].Price).toBe(399);
  });
});
