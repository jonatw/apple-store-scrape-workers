/**
 * 靜態 R2 處理器
 * 從 R2 存儲中提供靜態文件
 */

import { logger } from '../utils/logger';
import { corsify } from '../middleware/cors';
import { ApiError } from '../utils/error';
import { getMimeType } from '../utils/mime';

/**
 * 處理靜態 R2 請求
 * @param {Request} request - HTTP 請求
 * @param {Object} param1 - 環境和上下文
 * @returns {Promise<Response>} - HTTP 響應
 */
export async function handleStaticR2(request, { env }) {
  try {
    logger.info('Handling static R2 request');
    
    if (request.method !== 'GET') {
      logger.warn(`Invalid method for static R2 API: ${request.method}`);
      throw new ApiError('Method not allowed. Use GET.', 405);
    }
    
    const url = new URL(request.url);
    let path = url.pathname;
    
    // 如果路徑是根路徑，則默認為 index.html
    if (path === '/' || path === '') {
      path = '/index.html';
    }
    
    // 從 R2 獲取對象
    const object = await env.APPLE_STORE_DATA_BUCKET.get(path.substring(1));
    
    if (!object) {
      logger.warn(`File not found in R2: ${path}`);
      throw new ApiError('File not found', 404);
    }
    
    // 讀取數據
    const data = await object.arrayBuffer();
    
    // 確定內容類型
    const contentType = getMimeType(path);
    
    // 設置快取控制（數據文件短期快取，其他文件長期快取）
    const cacheControl = path.includes('/data/') ? 'public, max-age=300' : 'public, max-age=86400';
    
    return corsify(new Response(data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': cacheControl
      }
    }));
  } catch (error) {
    logger.error('Error handling static R2 request', error);
    
    if (error instanceof ApiError) {
      return corsify(new Response(JSON.stringify({
        error: error.name,
        message: error.message
      }), {
        status: error.status,
        headers: { 'Content-Type': 'application/json' }
      }));
    }
    
    return corsify(new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}
