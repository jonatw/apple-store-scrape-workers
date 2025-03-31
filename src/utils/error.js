/**
 * 錯誤工具模塊
 * 定義自訂錯誤類型和錯誤處理功能
 */

/**
 * API 錯誤類
 */
export class ApiError extends Error {
  /**
   * 創建 API 錯誤
   * @param {string} message - 錯誤消息
   * @param {number} status - HTTP 狀態碼
   */
  constructor(message, status = 500) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * 認證錯誤類
 */
export class AuthError extends Error {
  /**
   * 創建認證錯誤
   * @param {string} message - 錯誤消息
   */
  constructor(message) {
    super(message);
    this.name = 'AuthError';
    this.status = 401;
  }
}

/**
 * 資源未找到錯誤類
 */
export class NotFoundError extends Error {
  /**
   * 創建資源未找到錯誤
   * @param {string} message - 錯誤消息
   */
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.status = 404;
  }
}

/**
 * 配置錯誤類
 */
export class ConfigError extends Error {
  /**
   * 創建配置錯誤
   * @param {string} message - 錯誤消息
   */
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
    this.status = 500;
  }
}

/**
 * 格式化錯誤響應
 * @param {Error} error - 錯誤對象
 * @returns {Object} - 格式化後的錯誤響應對象
 */
export function formatErrorResponse(error) {
  return {
    error: error.name || 'Error',
    message: error.message,
    status: error.status || 500,
    timestamp: new Date().toISOString()
  };
}
