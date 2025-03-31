/**
 * 認證中間件
 * 處理 API 認證
 */

import { logger } from '../utils/logger';
import { AuthError, ConfigError } from '../utils/error';

/**
 * 認證中間件
 * 驗證 API 金鑰
 * @param {Request} request - HTTP 請求
 * @param {Object} env - 環境變量
 * @returns {Response|undefined} - 如果認證失敗則返回錯誤響應，否則返回 undefined
 */
export async function authMiddleware(request, { env }) {
  try {
    // 從 Authorization 標頭中提取 API 金鑰
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      logger.warn('No Authorization header found');
      throw new AuthError('Missing API key');
    }
    
    // 驗證 Authorization 標頭格式
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      logger.warn('Invalid Authorization header format');
      throw new AuthError('Invalid Authorization format');
    }
    
    const providedKey = parts[1];
    const expectedKey = env.API_KEY;
    
    // 檢查是否配置了 API 金鑰
    if (!expectedKey) {
      logger.error('API_KEY environment variable is not defined');
      
      // 開發模式下，接受任何非空 API 金鑰
      if (process.env.NODE_ENV === 'development') {
        logger.info('Development mode: Accepting any non-empty API key');
        return;
      }
      
      throw new ConfigError('API key not configured');
    }
    
    // 比較提供的金鑰和預期的金鑰
    if (providedKey !== expectedKey) {
      logger.warn('API key mismatch');
      throw new AuthError('Invalid API key');
    }
    
    // 認證成功，返回 undefined 以繼續處理請求
    return;
  } catch (error) {
    // 處理特定類型的錯誤
    if (error instanceof AuthError) {
      return new Response(JSON.stringify({
        error: 'Unauthorized',
        message: error.message
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (error instanceof ConfigError) {
      return new Response(JSON.stringify({
        error: 'Server Configuration Error',
        message: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 處理未預期的錯誤
    logger.error('Unexpected error in auth middleware', error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred during authentication'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
