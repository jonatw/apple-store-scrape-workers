/**
 * 開發測試處理器
 * 處理開發環境的測試請求
 */

import { logger } from '../utils/logger';
import { updateAllData } from '../updater';
import { getIPhoneData, getIPadData, getExchangeRateData, getLastUpdated } from '../storage/kv';
import { getAllDataFromR2 } from '../storage/r2';

/**
 * 處理開發測試請求
 * @param {Request} request - HTTP 請求
 * @param {Object} param1 - 環境和上下文
 * @returns {Promise<Response>} - HTTP 響應
 */
export async function handleDevTest(request, { env, ctx }) {
  try {
    const url = new URL(request.url);
    const path = url.pathname;
    
    logger.info(`Handling dev test request: ${path}`);
    
    switch (path) {
      case '/dev-test-update':
        return await handleDevTestUpdate(env, ctx);
      case '/test-kv':
        return await handleTestKv(env);
      case '/test-static':
        return await handleTestStatic(env);
      case '/test-r2':
        return await handleTestR2(env);
      default:
        return new Response('Unknown dev test endpoint', {
          status: 404,
          headers: { 'Content-Type': 'text/plain' }
        });
    }
  } catch (error) {
    logger.error('Error handling dev test request', error);
    return new Response(JSON.stringify({
      error: 'Error in dev test',
      message: error.message,
      stack: error.stack
    }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 處理開發環境的手動更新請求
 * @param {Object} env - 環境變量
 * @param {Object} ctx - 上下文
 * @returns {Promise<Response>} - HTTP 響應
 */
async function handleDevTestUpdate(env, ctx) {
  try {
    logger.info('Manual update triggered via dev-test-update route');
    
    // 初始化開發環境的 KV 存儲（如果需要）
    if (typeof globalThis.__DEV_KV_STORE === 'undefined') {
      globalThis.__DEV_KV_STORE = {};
    }
    
    // 執行數據更新
    const success = await updateAllData(env);
    
    if (!success) {
      return new Response('Update failed. Check logs for details.', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    return new Response('Manual update triggered and completed. Check logs for details.', {
      headers: { 'Content-Type': 'text/plain' }
    });
  } catch (error) {
    logger.error('Error during manual update', error);
    return new Response('Error during update: ' + error.message, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

/**
 * 測試 KV 存儲
 * @param {Object} env - 環境變量
 * @returns {Promise<Response>} - HTTP 響應
 */
async function handleTestKv(env) {
  try {
    logger.info('Testing KV storage');
    
    const iphoneData = await getIPhoneData(env);
    const ipadData = await getIPadData(env);
    const exchangeRateData = await getExchangeRateData(env);
    const lastUpdated = await getLastUpdated(env);
    
    return new Response(JSON.stringify({
      hasIPhoneData: !!iphoneData,
      hasIPadData: !!ipadData,
      hasExchangeRateData: !!exchangeRateData,
      lastUpdated,
      kvBinding: !!env.APPLE_STORE_DATA,
      kvBindingType: typeof env.APPLE_STORE_DATA,
      kvMethods: env.APPLE_STORE_DATA ? Object.keys(env.APPLE_STORE_DATA) : []
    }, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    logger.error('Error testing KV', error);
    return new Response(JSON.stringify({
      error: 'Error testing KV',
      message: error.message,
      stack: error.stack
    }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 測試靜態內容
 * @param {Object} env - 環境變量
 * @returns {Promise<Response>} - HTTP 響應
 */
async function handleTestStatic(env) {
  try {
    logger.info('Testing static content');
    
    const results = {
      hasStaticContent: !!env.__STATIC_CONTENT,
      staticContentType: typeof env.__STATIC_CONTENT,
      hasFetchMethod: !!(env.__STATIC_CONTENT && typeof env.__STATIC_CONTENT.fetch === 'function')
    };
    
    if (results.hasFetchMethod) {
      try {
        const response = await env.__STATIC_CONTENT.fetch(new Request('http://placeholder/index.html'));
        results.fetchStatus = response.status;
        results.fetchOk = response.ok;
        
        if (response.ok) {
          const content = await response.text();
          results.contentLength = content.length;
          results.hasInjectionPoint = content.includes('<script type="application/json" id="prefilled-data">');
          results.injectionPointIndex = content.indexOf('<script type="application/json" id="prefilled-data">');
        }
      } catch (fetchError) {
        results.fetchError = fetchError.message;
        results.fetchErrorStack = fetchError.stack;
      }
    }
    
    return new Response(JSON.stringify(results, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    logger.error('Error testing static content', error);
    return new Response(JSON.stringify({
      error: 'Error testing static content',
      message: error.message,
      stack: error.stack
    }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 測試 R2 存儲
 * @param {Object} env - 環境變量
 * @returns {Promise<Response>} - HTTP 響應
 */
async function handleTestR2(env) {
  try {
    logger.info('Testing R2 storage');
    
    const hasR2 = !!env.APPLE_STORE_DATA_BUCKET;
    const results = {
      hasR2,
      r2BindingType: typeof env.APPLE_STORE_DATA_BUCKET,
      r2Methods: hasR2 ? Object.keys(env.APPLE_STORE_DATA_BUCKET) : []
    };
    
    if (hasR2) {
      try {
        const list = await env.APPLE_STORE_DATA_BUCKET.list({ prefix: 'data/' });
        results.listResult = {
          objects: list.objects.map(obj => ({
            key: obj.key,
            size: obj.size,
            uploaded: obj.uploaded
          })),
          truncated: list.truncated,
          cursor: list.cursor
        };
        
        const allData = await getAllDataFromR2(env);
        results.hasAllData = !!allData;
        
        if (allData) {
          results.dataStats = {
            iphoneCount: allData.iphone?.products?.length || 0,
            ipadCount: allData.ipad?.products?.length || 0,
            lastUpdated: allData.lastUpdated
          };
        }
      } catch (listError) {
        results.listError = listError.message;
        results.listErrorStack = listError.stack;
      }
    }
    
    return new Response(JSON.stringify(results, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    logger.error('Error testing R2', error);
    return new Response(JSON.stringify({
      error: 'Error testing R2',
      message: error.message,
      stack: error.stack
    }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
