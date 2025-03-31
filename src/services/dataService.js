/**
 * 數據服務模塊
 * 處理數據的獲取和更新
 */

import { logger } from '../utils/logger';
import { getIPhoneData, getIPadData, getExchangeRateData, getLastUpdated } from '../storage/kv';
import { updateAllData } from '../updater';

/**
 * 獲取所有數據
 * @param {Object} env - 環境變量
 * @returns {Promise<Object>} - 所有數據
 */
export async function getAllData(env) {
  try {
    logger.info('Getting all data from KV storage');
    
    const [iphoneData, ipadData, exchangeRateData, lastUpdated] = await Promise.all([
      getIPhoneData(env),
      getIPadData(env),
      getExchangeRateData(env),
      getLastUpdated(env)
    ]);
    
    return {
      iphone: iphoneData || {
        products: [],
        metadata: {
          lastUpdated: new Date().toISOString(),
          regions: ['US', 'TW'],
          productType: 'iphone',
          totalProducts: 0
        }
      },
      ipad: ipadData || {
        products: [],
        metadata: {
          lastUpdated: new Date().toISOString(),
          regions: ['US', 'TW'],
          productType: 'ipad',
          totalProducts: 0
        }
      },
      exchangeRate: exchangeRateData || {
        rates: { USD: 1.0, TWD: 31.5 },
        lastUpdated: new Date().toISOString(),
        source: 'Default'
      },
      lastUpdated: lastUpdated || new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error getting all data', error);
    throw error;
  }
}

/**
 * 更新數據
 * @param {Object} env - 環境變量
 * @param {Object} ctx - 上下文
 * @returns {Promise<Object>} - 更新結果
 */
export async function updateData(env, ctx) {
  try {
    logger.info('Starting data update process');
    
    const success = await updateAllData(env);
    
    if (!success) {
      logger.error('Data update failed');
      throw new Error('Data update failed');
    }
    
    const updatedData = await getAllData(env);
    
    logger.info('Data update completed successfully', {
      iphoneCount: updatedData.iphone.products.length,
      ipadCount: updatedData.ipad.products.length,
      lastUpdated: updatedData.lastUpdated
    });
    
    return {
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        iphoneCount: updatedData.iphone.products.length,
        ipadCount: updatedData.ipad.products.length,
        lastUpdated: updatedData.lastUpdated
      }
    };
  } catch (error) {
    logger.error('Error updating data', error);
    return {
      success: false,
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
}

/**
 * 獲取數據統計
 * @param {Object} env - 環境變量
 * @returns {Promise<Object>} - 數據統計
 */
export async function getDataStats(env) {
  try {
    logger.info('Getting data statistics');
    
    const [iphoneData, ipadData, lastUpdated] = await Promise.all([
      getIPhoneData(env),
      getIPadData(env),
      getLastUpdated(env)
    ]);
    
    return {
      iphoneCount: iphoneData?.products?.length || 0,
      ipadCount: ipadData?.products?.length || 0,
      lastUpdated: lastUpdated || new Date().toISOString(),
      hasData: !!(iphoneData || ipadData)
    };
  } catch (error) {
    logger.error('Error getting data statistics', error);
    return {
      iphoneCount: 0,
      ipadCount: 0,
      lastUpdated: new Date().toISOString(),
      hasData: false,
      error: error.message
    };
  }
}
