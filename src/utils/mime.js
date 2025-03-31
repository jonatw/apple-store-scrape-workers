/**
 * MIME 類型工具模塊
 * 處理文件擴展名與 MIME 類型的映射
 */

/**
 * 根據文件名獲取 MIME 類型
 * @param {string} filename - 文件名（含擴展名）
 * @returns {string} - MIME 類型
 */
export function getMimeType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  
  const mimeTypes = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'txt': 'text/plain',
    'pdf': 'application/pdf',
    'xml': 'application/xml',
    'zip': 'application/zip',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'eot': 'application/vnd.ms-fontobject',
    'otf': 'font/otf'
  };
  
  return mimeTypes[ext] || 'text/plain';
}
