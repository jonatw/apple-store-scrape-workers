/**
 * iPad 數據抓取模塊
 */

import { REGIONS, DEFAULT_IPAD_MODELS, REQUEST_DELAY } from '../config';

/**
 * 獲取可用的 iPad 型號
 * @param {string} regionCode - 區域代碼
 * @returns {Promise<string[]>} - 可用型號列表
 */
export async function getAvailableModels(regionCode = '') {
  try {
    const baseUrl = `https://www.apple.com/${regionCode}/ipad/`;
    const response = await fetch(baseUrl);
    const html = await response.text();
    
    // 使用正則表達式提取型號
    const modelRegex = /\/shop\/buy-ipad\/([\w-]+)/g;
    const matches = [...html.matchAll(modelRegex)];
    const models = [...new Set(matches.map(match => match[1]))];
    
    if (models.length === 0) {
      console.log(`No iPad models found for region ${regionCode}, using defaults.`);
      // 回退到默認型號
      return DEFAULT_IPAD_MODELS;
    }
    
    return models;
  } catch (error) {
    console.error('Error getting available iPad models:', error);
    // 回退到默認型號
    return DEFAULT_IPAD_MODELS;
  }
}

/**
 * 提取產品詳情
 * @param {string} url - 產品頁面 URL
 * @param {string} regionCode - 區域代碼
 * @returns {Promise<Object[]>} - 產品詳情列表
 */
export async function extractProductDetails(url, regionCode = '') {
  try {
    console.log(`Fetching ${url}...`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    console.log(`Page fetched (${html.length} bytes). Looking for product data...`);
    
    // 嘗試多種方法來提取產品數據
    
    // 方法 1: 尋找 metrics script 標籤
    let metricsMatch = html.match(/<script id="metrics" type="application\/json">(.*?)<\/script>/s);
    if (metricsMatch) {
      console.log('Found product data in metrics script');
      const metricsData = JSON.parse(metricsMatch[1]);
      
      // 確保我們有產品數據
      if (metricsData.data && metricsData.data.products && Array.isArray(metricsData.data.products)) {
        // 提取產品數據
        const products = metricsData.data.products.map(product => {
          return {
            sku: product.sku || '',
            name: product.name || '',
            price: product.price?.fullPrice || 0,
            region: REGIONS[regionCode][0]
          };
        });
        
        return products;
      }
    }
    
    // 方法 2: 尋找 __NEXT_DATA__ script 標籤（常見於 Next.js 應用）
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
    if (nextDataMatch) {
      console.log('Found product data in __NEXT_DATA__ script');
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        // 根據實際結構進行適當的路徑訪問
        const productsData = nextData.props?.pageProps?.products || 
                             nextData.props?.initialState?.products || 
                             [];
        
        if (productsData && Array.isArray(productsData)) {
          const products = productsData.map(product => {
            return {
              sku: product.sku || product.partNumber || '',
              name: product.name || product.title || '',
              price: product.price?.fullPrice || product.price?.amount || 0,
              region: REGIONS[regionCode][0]
            };
          });
          
          return products;
        }
      } catch (error) {
        console.error('Error parsing __NEXT_DATA__:', error);
      }
    }
    
    // 方法 3: 尋找包含產品數據的任何 JSON script
    const scriptTags = html.match(/<script[^>]*type=['"]application\/json['"][^>]*>(.*?)<\/script>/gs) || [];
    for (const scriptTag of scriptTags) {
      try {
        const scriptContent = scriptTag.match(/<script[^>]*>(.*?)<\/script>/s)[1];
        const data = JSON.parse(scriptContent);
        
        // 嘗試找到包含產品數據的對象
        let products = [];
        
        // 檢查是否有產品數組
        if (data.products && Array.isArray(data.products)) {
          products = data.products;
        } else if (data.data && data.data.products && Array.isArray(data.data.products)) {
          products = data.data.products;
        }
        
        if (products.length > 0) {
          console.log(`Found ${products.length} products in JSON script`);
          return products.map(product => {
            return {
              sku: product.sku || product.partNumber || '',
              name: product.name || product.title || '',
              price: product.price?.fullPrice || product.price?.amount || product.price || 0,
              region: REGIONS[regionCode][0]
            };
          });
        }
      } catch (error) {
        // 忽略解析錯誤，嘗試下一個 script 標籤
      }
    }
    
    // 方法 4: 使用正則表達式直接從 HTML 中提取產品信息
    console.log('Using regex to extract product information');
    
    // 提取 SKU 和名稱
    const skuMatches = html.match(/partNumber["']?\s*:\s*["']([^"']+)["']/g) || [];
    const nameMatches = html.match(/name["']?\s*:\s*["']([^"']+)["']/g) || [];
    const priceMatches = html.match(/price["']?\s*:\s*["']?(\d+(?:\.\d+)?)["']?/g) || [];
    
    if (skuMatches.length > 0 || nameMatches.length > 0) {
      const skus = skuMatches.map(match => match.match(/["']([^"']+)["']/)[1]);
      const names = nameMatches.map(match => match.match(/["']([^"']+)["']/)[1]);
      const prices = priceMatches.map(match => parseFloat(match.match(/(\d+(?:\.\d+)?)/)[1]));
      
      const productCount = Math.max(skus.length, names.length);
      const products = [];
      
      for (let i = 0; i < productCount; i++) {
        products.push({
          sku: i < skus.length ? skus[i] : '',
          name: i < names.length ? names[i] : '',
          price: i < prices.length ? prices[i] : 0,
          region: REGIONS[regionCode][0]
        });
      }
      
      if (products.length > 0) {
        console.log(`Extracted ${products.length} products using regex`);
        return products;
      }
    }
    
    // 如果所有方法都失敗了，記錄 HTML 的一部分以幫助調試
    console.error('Failed to extract product data. HTML sample:');
    console.log(html.substring(0, 500) + '...');
    console.log('...' + html.substring(html.length - 500));
    
    throw new Error('No product data found in page');
  } catch (error) {
    console.error(`Error extracting product details from ${url}:`, error);
    return [];
  }
}

/**
 * 獲取所有 iPad 產品
 * @returns {Promise<Object[]>} - 所有區域的所有產品
 */
export async function getAllProducts() {
  const allProducts = [];
  const allModels = new Set();
  
  // 收集所有區域的所有型號
  for (const regionCode of Object.keys(REGIONS)) {
    const models = await getAvailableModels(regionCode);
    models.forEach(model => allModels.add(model));
  }
  
  // 抓取每個區域的每個型號
  for (const regionCode of Object.keys(REGIONS)) {
    for (const model of allModels) {
      try {
        const url = `https://www.apple.com/${regionCode}/shop/buy-ipad/${model}`;
        console.log(`Scraping ${url}...`);
        
        const products = await extractProductDetails(url, regionCode);
        allProducts.push(...products);
        
        // 添加延遲以避免速率限制
        await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
      } catch (error) {
        console.error(`Error scraping ${model} for region ${regionCode}:`, error);
      }
    }
  }
  
  return allProducts;
}
