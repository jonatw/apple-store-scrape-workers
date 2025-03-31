/**
 * 數據更新協調器
 * 協調所有抓取和更新操作
 */

import { getAllProducts as getAllIPhones } from './scraper/iphone';
import { getAllProducts as getAllIPads } from './scraper/ipad';
import { fetchExchangeRate } from './scraper/exchange-rate';
import { mergeProductData } from './processor/merge';
import { calculatePriceDifferences } from './processor/calculate';
import { KV_KEYS } from './config';
import { setData } from './storage/kv';
import { 
  storeIPhoneDataInR2, 
  storeIPadDataInR2, 
  storeExchangeRateDataInR2,
  storeAllDataInR2
} from './storage/r2';

/**
 * 更新所有數據
 * @param {Object} env - Worker 環境變量（可選）
 * @returns {Promise<boolean>} - 操作是否成功
 */
export async function updateAllData(env = {}) {
  try {
    console.log('Starting data update process...');
    
    // 抓取 iPhone 數據
    console.log('Fetching iPhone data...');
    const iphoneProducts = await getAllIPhones();
    const mergedIPhones = mergeProductData(iphoneProducts);
    
    // 抓取 iPad 數據
    console.log('Fetching iPad data...');
    const ipadProducts = await getAllIPads();
    const mergedIPads = mergeProductData(ipadProducts);
    
    // 抓取匯率數據
    console.log('Fetching exchange rate data...');
    const exchangeRate = await fetchExchangeRate();
    
    // 計算價格差異
    console.log('Calculating price differences...');
    const processedIPhones = calculatePriceDifferences(mergedIPhones, exchangeRate);
    const processedIPads = calculatePriceDifferences(mergedIPads, exchangeRate);
    
    // 準備 JSON 數據
    const now = new Date().toISOString();
    
    const iphoneData = {
      metadata: {
        lastUpdated: now,
        exchangeRates: {
          USD: 1.0,
          TWD: exchangeRate
        },
        regions: ['US', 'TW'],
        productType: 'iphone',
        totalProducts: processedIPhones.length
      },
      products: processedIPhones
    };
    
    const ipadData = {
      metadata: {
        lastUpdated: now,
        exchangeRates: {
          USD: 1.0,
          TWD: exchangeRate
        },
        regions: ['US', 'TW'],
        productType: 'ipad',
        totalProducts: processedIPads.length
      },
      products: processedIPads
    };
    
    const exchangeRateData = {
      rates: {
        USD: 1.0,
        TWD: exchangeRate
      },
      lastUpdated: now,
      source: 'Cathay Bank'
    };
    
    // 儲存到 KV
    console.log('Storing data to KV...');
    if (!env) {
      throw new Error('Environment object is undefined');
    }

    // 顯示可用的環境變數，幫助調試
    console.log('Available env properties:', Object.keys(env));

    await setData(env, KV_KEYS.IPHONE_DATA, iphoneData);
    await setData(env, KV_KEYS.IPAD_DATA, ipadData);
    await setData(env, KV_KEYS.EXCHANGE_RATE, exchangeRateData);
    await setData(env, KV_KEYS.LAST_UPDATED, now);
    
    console.log('KV storage completed successfully.');
    
    // 儲存到 R2
    console.log('Storing data to R2...');
    if (env.APPLE_STORE_DATA_BUCKET) {
      // Create combined data object for all.json
      const allData = {
        iphone: iphoneData,
        ipad: ipadData,
        exchangeRate: exchangeRateData,
        lastUpdated: now
      };
      
      // Store data in R2
      await Promise.all([
        storeIPhoneDataInR2(env, iphoneData),
        storeIPadDataInR2(env, ipadData),
        storeExchangeRateDataInR2(env, exchangeRateData),
        storeAllDataInR2(env, allData)
      ]);
      
      console.log('R2 storage completed successfully.');
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
