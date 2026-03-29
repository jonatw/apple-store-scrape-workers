/**
 * Data update orchestrator.
 * Coordinates all scraping, processing, and storage operations.
 */

import { getAllProducts as getAllIPhones } from './scraper/iphone';
import { getAllProducts as getAllIPads } from './scraper/ipad';
import { getAllProducts as getAllMacs } from './scraper/mac';
import { MAC_EXTRA_COLUMNS } from './scraper/mac';
import { getAllProducts as getAllWatches } from './scraper/watch';
import { getAllProducts as getAllAirPods } from './scraper/airpods';
import { getAllProducts as getAllTVHome } from './scraper/tvhome';
import { fetchExchangeRate } from './scraper/exchange-rate';
import { mergeProductData } from './processor/merge';
import { consolidateColors } from './processor/consolidateColors';
import { calculatePriceDifferences } from './processor/calculate';
import { KV_KEYS } from './config';
import { setData } from './storage/kv';
import {
  storeIPhoneDataInR2,
  storeIPadDataInR2,
  storeMacDataInR2,
  storeWatchDataInR2,
  storeAirPodsDataInR2,
  storeTVHomeDataInR2,
  storeExchangeRateDataInR2,
  storeAllDataInR2,
} from './storage/r2';

/**
 * Process a single product category: merge → consolidate colors → calculate prices.
 */
function processProducts(rawProducts, exchangeRate, productType, extraColumns = null) {
  const merged = mergeProductData(rawProducts, extraColumns);
  const consolidated = consolidateColors(merged, productType);
  return calculatePriceDifferences(consolidated, exchangeRate);
}

/**
 * Build a JSON data envelope with metadata.
 */
function buildDataEnvelope(products, productType, exchangeRate, now) {
  return {
    metadata: {
      lastUpdated: now,
      exchangeRates: { USD: 1.0, TWD: exchangeRate },
      regions: ['US', 'TW'],
      productType,
      totalProducts: products.length,
    },
    products,
  };
}

/**
 * Update all data — called by Cron trigger and POST /api/update.
 * @param {Object} env - Worker environment bindings
 * @returns {Promise<boolean>} Whether the update succeeded
 */
export async function updateAllData(env = {}) {
  try {
    console.log('Starting data update process...');

    // Fetch exchange rate first (needed for price calculations)
    console.log('Fetching exchange rate...');
    const exchangeRate = await fetchExchangeRate();

    // Fetch all product categories
    const iphoneProducts = await getAllIPhones();
    const ipadProducts = await getAllIPads();
    const macProducts = await getAllMacs();
    const watchProducts = await getAllWatches();
    const airpodsProducts = await getAllAirPods();
    const tvhomeProducts = await getAllTVHome();

    // Process each category: merge → consolidate colors → calculate prices
    console.log('Processing products...');
    const processedIPhones = processProducts(iphoneProducts, exchangeRate, 'iphone');
    const processedIPads = processProducts(ipadProducts, exchangeRate, 'ipad');
    const processedMacs = processProducts(macProducts, exchangeRate, 'mac', MAC_EXTRA_COLUMNS);
    const processedWatches = processProducts(watchProducts, exchangeRate, 'watch');
    const processedAirPods = processProducts(airpodsProducts, exchangeRate, 'airpods');
    const processedTVHome = processProducts(tvhomeProducts, exchangeRate, 'tvhome');

    // Build JSON envelopes
    const now = new Date().toISOString();

    const iphoneData = buildDataEnvelope(processedIPhones, 'iphone', exchangeRate, now);
    const ipadData = buildDataEnvelope(processedIPads, 'ipad', exchangeRate, now);
    const macData = buildDataEnvelope(processedMacs, 'mac', exchangeRate, now);
    const watchData = buildDataEnvelope(processedWatches, 'watch', exchangeRate, now);
    const airpodsData = buildDataEnvelope(processedAirPods, 'airpods', exchangeRate, now);
    const tvhomeData = buildDataEnvelope(processedTVHome, 'tvhome', exchangeRate, now);

    const exchangeRateData = {
      rates: { USD: 1.0, TWD: exchangeRate },
      lastUpdated: now,
      source: 'Cathay Bank',
    };

    // Store to KV
    console.log('Storing data to KV...');
    if (!env) throw new Error('Environment object is undefined');

    await setData(env, KV_KEYS.IPHONE_DATA, iphoneData);
    await setData(env, KV_KEYS.IPAD_DATA, ipadData);
    await setData(env, KV_KEYS.MAC_DATA, macData);
    await setData(env, KV_KEYS.WATCH_DATA, watchData);
    await setData(env, KV_KEYS.AIRPODS_DATA, airpodsData);
    await setData(env, KV_KEYS.TVHOME_DATA, tvhomeData);
    await setData(env, KV_KEYS.EXCHANGE_RATE, exchangeRateData);
    await setData(env, KV_KEYS.LAST_UPDATED, now);

    console.log('KV storage completed.');

    // Store to R2
    if (env.APPLE_STORE_DATA_BUCKET) {
      console.log('Storing data to R2...');

      const allData = {
        iphone: iphoneData,
        ipad: ipadData,
        mac: macData,
        watch: watchData,
        airpods: airpodsData,
        tvhome: tvhomeData,
        exchangeRate: exchangeRateData,
        lastUpdated: now,
      };

      await Promise.all([
        storeIPhoneDataInR2(env, iphoneData),
        storeIPadDataInR2(env, ipadData),
        storeMacDataInR2(env, macData),
        storeWatchDataInR2(env, watchData),
        storeAirPodsDataInR2(env, airpodsData),
        storeTVHomeDataInR2(env, tvhomeData),
        storeExchangeRateDataInR2(env, exchangeRateData),
        storeAllDataInR2(env, allData),
      ]);

      console.log('R2 storage completed.');
    } else {
      console.log('R2 bucket binding not available, skipping R2 storage.');
    }

    console.log('Data update completed successfully.');
    return true;
  } catch (error) {
    console.error('Error updating data:', error);
    return false;
  }
}
