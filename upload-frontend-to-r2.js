/**
 * 將前端資源上傳到 R2 儲存桶的腳本
 * 
 * 用法: node upload-frontend-to-r2.js
 * 
 * 此腳本會將 frontend 目錄下的所有文件上傳到 R2 儲存桶，
 * 這樣前端資源就可以直接從 R2 提供服務，而不需要透過 Worker。
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// R2 儲存桶名稱
const BUCKET_NAME = 'apple-store-data';
// 前端目錄
const FRONTEND_DIR = './frontend';
// 排除的檔案和目錄
const EXCLUDE_PATTERNS = ['.DS_Store', 'node_modules', '.git'];

/**
 * 遞迴取得目錄下的所有文件
 * @param {string} dir - 目錄路徑
 * @param {string} baseDir - 基礎目錄路徑
 * @returns {Promise<string[]>} - 文件路徑列表
 */
async function getFiles(dir, baseDir = dir) {
  const dirents = fs.readdirSync(dir, { withFileTypes: true });
  const files = await Promise.all(
    dirents.map(async (dirent) => {
      if (EXCLUDE_PATTERNS.includes(dirent.name)) return [];
      
      const res = path.resolve(dir, dirent.name);
      const relativePath = path.relative(baseDir, res);
      
      if (dirent.isDirectory()) {
        return getFiles(res, baseDir);
      } else {
        return relativePath;
      }
    })
  );
  
  return files.flat();
}

/**
 * 上傳文件到 R2
 * @param {string} filePath - 文件路徑
 * @param {string} key - R2 路徑
 * @returns {Promise<void>}
 */
async function uploadFile(filePath, key) {
  try {
    const fullPath = path.resolve(FRONTEND_DIR, filePath);
    const contentType = getContentType(filePath);
    const cacheControl = getCacheControl(filePath);
    
    console.log(`Uploading: ${filePath} -> ${key} (${contentType})`);
    
    // 使用 wrangler CLI 上傳檔案
    const command = `wrangler r2 object put ${BUCKET_NAME}/${key} --file=${fullPath} --content-type="${contentType}" --metadata="cache-control:${cacheControl}"`;
    
    const { stdout, stderr } = await execPromise(command);
    
    if (stderr) {
      console.error(`Error uploading ${filePath}:`, stderr);
    } else {
      console.log(`Uploaded ${filePath} successfully.`);
    }
  } catch (error) {
    console.error(`Failed to upload ${filePath}:`, error);
  }
}

/**
 * 獲取內容類型
 * @param {string} filePath - 文件路徑
 * @returns {string} - 內容類型
 */
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  const contentTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };
  
  return contentTypes[ext] || 'text/plain';
}

/**
 * 獲取快取控制頭
 * @param {string} filePath - 文件路徑
 * @returns {string} - 快取控制頭
 */
function getCacheControl(filePath) {
  // 數據文件短期快取，其他文件長期快取
  if (filePath.includes('data/')) {
    return 'public, max-age=300';
  } else {
    return 'public, max-age=86400';
  }
}

/**
 * 主函數
 */
async function main() {
  try {
    console.log(`Starting upload from ${FRONTEND_DIR} to R2 bucket ${BUCKET_NAME}...`);
    
    // 檢查目錄是否存在
    if (!fs.existsSync(FRONTEND_DIR)) {
      throw new Error(`Frontend directory ${FRONTEND_DIR} does not exist!`);
    }
    
    // 獲取所有檔案
    const files = await getFiles(FRONTEND_DIR);
    console.log(`Found ${files.length} files to upload.`);
    
    // 上傳所有檔案
    for (const file of files) {
      await uploadFile(file, file);
    }
    
    console.log('Upload completed successfully!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// 執行主函數
main();
