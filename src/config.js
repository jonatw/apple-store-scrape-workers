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

// 默認 Mac 型號
export const DEFAULT_MAC_MODELS = ['mac-mini', 'imac', 'mac-studio', 'macbook-air', 'macbook-pro'];

// 默認 Apple Watch 型號
export const DEFAULT_WATCH_MODELS = ['apple-watch', 'apple-watch-se', 'apple-watch-ultra'];

// 默認 AirPods 型號
export const DEFAULT_AIRPODS_MODELS = ['airpods-4', 'airpods-pro-3', 'airpods-max-2'];

// 默認 Apple TV 型號
export const DEFAULT_TV_MODELS = ['apple-tv-4k'];

// 默認 HomePod 型號
export const DEFAULT_HOMEPOD_MODELS = ['homepod', 'homepod-mini'];

// 請求延遲（毫秒）
export const REQUEST_DELAY = 1000;

// API 路由前綴
export const API_PREFIX = '/api';

// KV 存儲鍵
export const KV_KEYS = {
  IPHONE_DATA: 'iphone_data',
  IPAD_DATA: 'ipad_data',
  MAC_DATA: 'mac_data',
  WATCH_DATA: 'watch_data',
  AIRPODS_DATA: 'airpods_data',
  TVHOME_DATA: 'tvhome_data',
  EXCHANGE_RATE: 'exchange_rate',
  LAST_UPDATED: 'last_updated'
};

// 默認匯率（如果無法獲取當前匯率）
export const DEFAULT_EXCHANGE_RATE = 31.5; // USD/TWD
