/**
 * API 路由器
 * 定義和處理 API 路由
 */

import { Router } from 'itty-router';
import { authMiddleware } from './middleware/auth';
import { handleApiUpdate, handleApiData, handleApiStats } from './handlers/apiHandler';
import { handleDevTest } from './handlers/devHandler';
import { handleStaticR2 } from './handlers/staticR2Handler';
import { createCorsMiddleware } from './middleware/cors';
import { logger } from './utils/logger';
import { API_PREFIX } from './config';

// 創建 CORS 中間件
export const { preflight, corsify } = createCorsMiddleware();

// 創建路由器
export const router = Router();

/**
 * 初始化路由
 */
function initializeRoutes() {
  logger.info('Initializing routes');

  // CORS 預檢
  router.options('*', preflight);

  // API 端點
  router.post(`${API_PREFIX}/update`, authMiddleware, handleApiUpdate);
  router.get(`${API_PREFIX}/stats`, handleApiStats);
  router.get(`${API_PREFIX}/all.json`, handleApiData);
  router.get(`${API_PREFIX}/iphone.json`, handleApiData);
  router.get(`${API_PREFIX}/ipad.json`, handleApiData);
  router.get(`${API_PREFIX}/mac.json`, handleApiData);
  router.get(`${API_PREFIX}/watch.json`, handleApiData);
  router.get(`${API_PREFIX}/airpods.json`, handleApiData);
  router.get(`${API_PREFIX}/tvhome.json`, handleApiData);
  router.get(`${API_PREFIX}/exchange-rate.json`, handleApiData);

  // 開發測試端點
  router.get('/dev-test-update', handleDevTest);
  router.get('/test-kv', handleDevTest);
  router.get('/test-static', handleDevTest);
  router.get('/test-r2', handleDevTest);

  // 靜態資源（從 R2 獲取）
  router.get('*', handleStaticR2);

  logger.info('Routes initialized');
}

// 運行初始化
initializeRoutes();
