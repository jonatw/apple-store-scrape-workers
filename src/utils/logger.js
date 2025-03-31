/**
 * 日誌工具模塊
 * 提供統一的日誌記錄功能
 */

export const logger = {
  /**
   * 記錄信息級別的日誌
   * @param {string} message - 日誌消息
   * @param {Object} data - 附加數據 (可選)
   */
  info(message, data = {}) {
    console.log(`[INFO] ${message}`, data);
  },

  /**
   * 記錄錯誤級別的日誌
   * @param {string} message - 日誌消息
   * @param {Error|Object} error - 錯誤對象或附加數據
   */
  error(message, error) {
    console.error(`[ERROR] ${message}`, error);
  },

  /**
   * 記錄警告級別的日誌
   * @param {string} message - 日誌消息
   * @param {Object} data - 附加數據 (可選)
   */
  warn(message, data = {}) {
    console.warn(`[WARN] ${message}`, data);
  },

  /**
   * 記錄調試級別的日誌
   * @param {string} message - 日誌消息
   * @param {Object} data - 附加數據 (可選)
   */
  debug(message, data = {}) {
    console.debug(`[DEBUG] ${message}`, data);
  }
};
