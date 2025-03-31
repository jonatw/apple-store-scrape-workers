/**
 * KV 存儲模塊
 * 處理 Cloudflare KV 存儲操作
 */

import { logger } from '../utils/logger';
import { ConfigError } from '../utils/error';
import { KV_KEYS } from '../config';

/**
 * 從 KV 獲取數據
 * @param {Object} env - Worker 環境變量
 * @param {string} key - 存儲鍵名
 * @returns {Promise<Object|null>} - 返回解析後的 JSON 數據，或 null
 */
export async function getData(env, key) {
  if (!env?.APPLE_STORE_DATA) {
    logger.error('KV binding APPLE_STORE_DATA not available');
    return null;
  }

  try {
    logger.debug(`Getting data for key: ${key}`);
    const data = await env.APPLE_STORE_DATA.get(key);
    
    if (!data) {
      logger.info(`No data found for key: ${key}`);
      return null;
    }
    
    return JSON.parse(data);
  } catch (error) {
    logger.error(`Error getting data for key ${key}:`, error);
    return null;
  }
}

/**
 * 將數據存儲到 KV
 * @param {Object} env - Worker 環境變量
 * @param {string} key - 存儲鍵名
 * @param {Object} data - 要存儲的數據
 * @returns {Promise<boolean>} - 操作是否成功
 */
export async function setData(env, key, data) {
  if (!env?.APPLE_STORE_DATA) {
    logger.error('KV binding APPLE_STORE_DATA not available');
    throw new ConfigError('KV binding not available');
  }

  try {
    logger.debug(`Setting data for key: ${key}`);
    const jsonData = JSON.stringify(data);
    await env.APPLE_STORE_DATA.put(key, jsonData);
    logger.info(`Successfully stored data for key: ${key}`);
    return true;
  } catch (error) {
    logger.error(`Error setting data for key ${key}:`, error);
    throw error;
  }
}

/**
 * 獲取 iPhone 數據
 * @param {Object} env - Worker 環境變量
 * @returns {Promise<Object|null>} - iPhone 數據
 */
export const getIPhoneData = (env) => getData(env, KV_KEYS.IPHONE_DATA);

/**
 * 獲取 iPad 數據
 * @param {Object} env - Worker 環境變量
 * @returns {Promise<Object|null>} - iPad 數據
 */
export const getIPadData = (env) => getData(env, KV_KEYS.IPAD_DATA);

/**
 * 獲取匯率數據
 * @param {Object} env - Worker 環境變量
 * @returns {Promise<Object|null>} - 匯率數據
 */
export const getExchangeRateData = (env) => getData(env, KV_KEYS.EXCHANGE_RATE);

/**
 * 獲取最後更新時間
 * @param {Object} env - Worker 環境變量
 * @returns {Promise<string|null>} - 最後更新時間
 */
export const getLastUpdated = (env) => getData(env, KV_KEYS.LAST_UPDATED);

/**
 * 獲取所有數據
 * @param {Object} env - Worker 環境變量
 * @returns {Promise<Object|null>} - 所有數據的組合
 */
export async function getAllData(env) {
  try {
    logger.debug('Getting all data from KV');
    
    const [iphoneData, ipadData, exchangeRateData, lastUpdated] = await Promise.all([
      getIPhoneData(env),
      getIPadData(env),
      getExchangeRateData(env),
      getLastUpdated(env)
    ]);
    
    if (!iphoneData && !ipadData) {
      logger.info('No data found in KV');
      return null;
    }
    
    return {
      iphone: iphoneData,
      ipad: ipadData,
      exchangeRate: exchangeRateData,
      lastUpdated: lastUpdated?.timestamp || new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error getting all data from KV:', error);
    return null;
  }
}
