/**
 * 錯誤處理中間件
 * 統一處理所有 API 錯誤
 */

import { logger } from '../utils/logger';
import { ApiError, AuthError, NotFoundError, ConfigError, formatErrorResponse } from '../utils/error';

/**
 * 處理錯誤並生成適當的錯誤響應
 * @param {Error} error - 捕獲到的錯誤
 * @param {Request} request - 原始請求對象
 * @returns {Response} - 錯誤響應
 */
export function errorHandler(error, request) {
  logger.error('Unhandled error', error);
  
  // 記錄錯誤的詳細信息
  const url = request.url || 'unknown';
  logger.error(`Error occurred while processing request to ${url}`, {
    url,
    method: request.method,
    errorName: error.name,
    errorMessage: error.message,
    errorStack: error.stack
  });
  
  // 默認錯誤狀態和消息
  let status = 500;
  let errorBody = {
    error: 'Internal Server Error',
    message: 'An unexpected error occurred'
  };
  
  // 根據錯誤類型定制響應
  if (error instanceof NotFoundError) {
    status = 404;
    errorBody = formatErrorResponse(error);
  } else if (error instanceof AuthError) {
    status = 401;
    errorBody = formatErrorResponse(error);
  } else if (error instanceof ApiError) {
    status = error.status || 500;
    errorBody = formatErrorResponse(error);
  } else if (error instanceof ConfigError) {
    status = 500;
    errorBody = formatErrorResponse(error);
  } else if (error instanceof SyntaxError) {
    status = 400;
    errorBody = {
      error: 'Bad Request',
      message: 'Invalid JSON or syntax error',
      details: error.message
    };
  } else if (error instanceof TypeError) {
    status = 500;
    errorBody = {
      error: 'Server Error',
      message: 'A type error occurred',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    };
  } else {
    // 通用錯誤處理
    errorBody = {
      error: error.name || 'Error',
      message: error.message || 'An unexpected error occurred',
      status: error.status || 500,
      timestamp: new Date().toISOString()
    };
  }
  
  // 在開發環境中添加堆棧信息
  if (process.env.NODE_ENV === 'development') {
    errorBody.stack = error.stack;
  }
  
  // 返回 JSON 錯誤響應
  return new Response(JSON.stringify(errorBody), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
