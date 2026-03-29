/**
 * 數據服務模塊
 * 處理數據的獲取和更新
 */

import { logger } from '../utils/logger';
import {
  getIPhoneData, getIPadData, getMacData, getWatchData,
  getAirPodsData, getTVHomeData, getExchangeRateData, getLastUpdated
} from '../storage/kv';
import { updateAllData } from '../updater';

const PRODUCT_TYPES = ['iphone', 'ipad', 'mac', 'watch', 'airpods', 'tvhome'];

const PRODUCT_GETTERS = {
  iphone: getIPhoneData,
  ipad: getIPadData,
  mac: getMacData,
  watch: getWatchData,
  airpods: getAirPodsData,
  tvhome: getTVHomeData,
};

function emptyProduct(type) {
  return { products: [], metadata: { lastUpdated: new Date().toISOString(), regions: ['US', 'TW'], productType: type, totalProducts: 0 } };
}

/**
 * 獲取所有數據
 */
export async function getAllData(env) {
  try {
    logger.info('Getting all data from KV storage');

    const results = await Promise.all([
      ...PRODUCT_TYPES.map(t => PRODUCT_GETTERS[t](env)),
      getExchangeRateData(env),
      getLastUpdated(env),
    ]);

    const data = {};
    PRODUCT_TYPES.forEach((t, i) => { data[t] = results[i] || emptyProduct(t); });
    data.exchangeRate = results[PRODUCT_TYPES.length] || { rates: { USD: 1.0, TWD: 31.5 }, lastUpdated: new Date().toISOString(), source: 'Default' };
    data.lastUpdated = results[PRODUCT_TYPES.length + 1] || new Date().toISOString();

    return data;
  } catch (error) {
    logger.error('Error getting all data', error);
    throw error;
  }
}

/**
 * 更新數據
 */
export async function updateData(env, ctx) {
  try {
    logger.info('Starting data update process');

    const success = await updateAllData(env);
    if (!success) throw new Error('Data update failed');

    const updatedData = await getAllData(env);

    const counts = {};
    for (const t of PRODUCT_TYPES) {
      counts[`${t}Count`] = updatedData[t]?.products?.length || 0;
    }

    logger.info('Data update completed successfully', counts);

    return {
      success: true,
      timestamp: new Date().toISOString(),
      data: { ...counts, lastUpdated: updatedData.lastUpdated },
    };
  } catch (error) {
    logger.error('Error updating data', error);
    return { success: false, timestamp: new Date().toISOString(), error: error.message };
  }
}

/**
 * 獲取數據統計
 */
export async function getDataStats(env) {
  try {
    logger.info('Getting data statistics');

    const results = await Promise.all([
      ...PRODUCT_TYPES.map(t => PRODUCT_GETTERS[t](env)),
      getLastUpdated(env),
    ]);

    const counts = {};
    let hasData = false;
    PRODUCT_TYPES.forEach((t, i) => {
      counts[`${t}Count`] = results[i]?.products?.length || 0;
      if (results[i]) hasData = true;
    });

    return {
      ...counts,
      lastUpdated: results[PRODUCT_TYPES.length] || new Date().toISOString(),
      hasData,
    };
  } catch (error) {
    logger.error('Error getting data statistics', error);
    return { lastUpdated: new Date().toISOString(), hasData: false, error: error.message };
  }
}
