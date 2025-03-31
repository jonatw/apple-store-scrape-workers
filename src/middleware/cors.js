/**
 * CORS 中間件
 * 處理跨域資源請求
 */

import { createCors } from 'itty-cors';
import { logger } from '../utils/logger';

/**
 * 創建 CORS 中間件
 * @returns {Object} - 包含 preflight 和 corsify 方法的物件
 */
export function createCorsMiddleware() {
  logger.debug('Creating CORS middleware');
  
  const { preflight, corsify } = createCors({
    origins: ['*'],  // 允許所有來源
    methods: ['GET', 'POST', 'OPTIONS'],  // 允許的 HTTP 方法
    headers: {
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'  // 24 小時
    }
  });
  
  return { preflight, corsify };
}

// 創建並導出 CORS 中間件實例
export const { preflight, corsify } = createCorsMiddleware();
