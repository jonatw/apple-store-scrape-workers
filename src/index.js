/**
 * Apple Store Scraper Worker 主入口
 * 處理所有請求並協調各個模塊
 */

import { router, corsify } from './router';
import { errorHandler } from './middleware/errorHandler';
import { updateAllData } from './updater';
import { logger } from './utils/logger';

/**
 * Worker 主入口
 * 處理所有 HTTP 請求
 */
export default {
  /**
   * 處理 HTTP 請求
   * @param {Request} request - HTTP 請求對象
   * @param {Object} env - Worker 環境變量
   * @param {Object} ctx - Worker 上下文
   * @returns {Promise<Response>} - HTTP 響應
   */
  async fetch(request, env, ctx) {
    try {
      logger.info(`Request received: ${request.method} ${request.url}`);
      
      // 使用路由器處理請求
      return router.handle(request, { env, ctx })
        .then(corsify)
        .catch(error => errorHandler(error, request));
    } catch (error) {
      logger.error('Unhandled error in fetch handler', error);
      return errorHandler(error, request);
    }
  },
  
  /**
   * 處理定時事件 (Cron 觸發器)
   * @param {Object} event - 定時事件對象
   * @param {Object} env - Worker 環境變量
   * @param {Object} ctx - Worker 上下文
   * @returns {Promise<void>}
   */
  async scheduled(event, env, ctx) {
    try {
      logger.info('Scheduled event triggered', { 
        cron: event.cron,
        scheduledTime: new Date(event.scheduledTime).toISOString()
      });
      
      // 執行數據更新
      const success = await updateAllData(env);
      
      if (success) {
        logger.info('Scheduled update completed successfully');
      } else {
        logger.error('Scheduled update failed');
      }
    } catch (error) {
      logger.error('Error in scheduled handler', error);
      // 在定時事件中，我們無法返回響應，只能記錄錯誤
    }
  }
};
