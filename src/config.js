/**
 * 全局配置文件
 */

// 區域配置：region_code: [display_name, currency_code, locale, currency_symbol]
export const REGIONS = {
  "": ["US", "USD", "en-us", "$"],       // 美國
  "tw": ["TW", "TWD", "zh-tw", "NT$"],   // 台灣
};

// 參考區域（用於產品名稱標準化）
export const REFERENCE_REGION = Object.keys(REGIONS)[0];

// 默認 iPhone 型號（如果動態檢測失敗）
export const DEFAULT_IPHONE_MODELS = ['iphone-16-pro', 'iphone-16', 'iphone-16e', 'iphone-15'];

// 默認 iPad 型號（如果動態檢測失敗）
export const DEFAULT_IPAD_MODELS = ['ipad-pro', 'ipad-air', 'ipad', 'ipad-mini'];

// 請求延遲（毫秒）
export const REQUEST_DELAY = 1000;

// 最大重試次數
export const MAX_RETRIES = 3;

// 調試模式
export const DEBUG = false;

// API 路由前綴
export const API_PREFIX = '/api';

// KV 存儲鍵
export const KV_KEYS = {
  IPHONE_DATA: 'iphone_data',
  IPAD_DATA: 'ipad_data',
  EXCHANGE_RATE: 'exchange_rate',
  LAST_UPDATED: 'last_updated'
};

// 默認匯率（如果無法獲取當前匯率）
export const DEFAULT_EXCHANGE_RATE = 31.5; // USD/TWD
