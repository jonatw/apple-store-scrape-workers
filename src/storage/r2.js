/**
 * R2 存儲模塊
 * 處理 Cloudflare R2 存儲操作
 */

import { logger } from '../utils/logger';

/**
 * 將 JSON 數據存儲到 R2
 * @param {Object} env - Worker 環境變量
 * @param {string} path - 存儲路徑
 * @param {Object} data - 要存儲的數據
 * @returns {Promise<boolean>} - 操作是否成功
 */
export async function storeJsonInR2(env, path, data) {
  if (!env?.APPLE_STORE_DATA_BUCKET) {
    logger.error('R2 bucket binding not available');
    return false;
  }

  try {
    logger.info(`Storing JSON data at path: ${path}`);
    const json = JSON.stringify(data);
    
    await env.APPLE_STORE_DATA_BUCKET.put(path, json, {
      httpMetadata: {
        contentType: 'application/json',
        cacheControl: 'public, max-age=300' // 5分鐘快取
      }
    });
    
    logger.info(`Successfully stored JSON at: ${path}`);
    return true;
  } catch (error) {
    logger.error(`Error storing JSON at path ${path}:`, error);
    return false;
  }
}

/**
 * 從 R2 獲取 JSON 數據
 * @param {Object} env - Worker 環境變量
 * @param {string} path - 存儲路徑
 * @returns {Promise<Object|null>} - 返回解析後的 JSON 數據，或 null
 */
export async function getJsonFromR2(env, path) {
  if (!env?.APPLE_STORE_DATA_BUCKET) {
    logger.error('R2 bucket binding not available');
    return null;
  }

  try {
    logger.info(`Getting JSON data from path: ${path}`);
    const object = await env.APPLE_STORE_DATA_BUCKET.get(path);
    
    if (!object) {
      logger.info(`No data found at path: ${path}`);
      return null;
    }
    
    const json = await object.json();
    logger.info(`Successfully retrieved JSON from: ${path}`);
    return json;
  } catch (error) {
    logger.error(`Error getting JSON from path ${path}:`, error);
    return null;
  }
}

/**
 * 從 R2 獲取所有數據
 * @param {Object} env - Worker 環境變量
 * @returns {Promise<Object|null>} - 返回所有數據
 */
export const getAllDataFromR2 = (env) => getJsonFromR2(env, 'data/all.json');

/**
 * 將 iPhone 數據存儲到 R2
 * @param {Object} env - Worker 環境變量
 * @param {Object} data - iPhone 數據
 * @returns {Promise<boolean>} - 操作是否成功
 */
export const storeIPhoneDataInR2 = (env, data) => storeJsonInR2(env, 'data/iphone.json', data);

/**
 * 將 iPad 數據存儲到 R2
 * @param {Object} env - Worker 環境變量
 * @param {Object} data - iPad 數據
 * @returns {Promise<boolean>} - 操作是否成功
 */
export const storeIPadDataInR2 = (env, data) => storeJsonInR2(env, 'data/ipad.json', data);
export const storeMacDataInR2 = (env, data) => storeJsonInR2(env, 'data/mac.json', data);
export const storeWatchDataInR2 = (env, data) => storeJsonInR2(env, 'data/watch.json', data);
export const storeAirPodsDataInR2 = (env, data) => storeJsonInR2(env, 'data/airpods.json', data);
export const storeTVHomeDataInR2 = (env, data) => storeJsonInR2(env, 'data/tvhome.json', data);

/**
 * 將匯率數據存儲到 R2
 * @param {Object} env - Worker 環境變量
 * @param {Object} data - 匯率數據
 * @returns {Promise<boolean>} - 操作是否成功
 */
export const storeExchangeRateDataInR2 = (env, data) => storeJsonInR2(env, 'data/exchange-rate.json', data);

/**
 * 將所有數據存儲到 R2
 * @param {Object} env - Worker 環境變量
 * @param {Object} data - 所有數據
 * @returns {Promise<boolean>} - 操作是否成功
 */
export const storeAllDataInR2 = (env, data) => storeJsonInR2(env, 'data/all.json', data);
