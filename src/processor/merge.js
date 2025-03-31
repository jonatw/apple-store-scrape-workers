/**
 * 產品數據合併模塊
 * 將來自不同區域的產品數據合併
 */

/**
 * 合併產品數據
 * @param {Object[]} products - 來自各區域的產品數據
 * @returns {Object[]} - 合併後的產品數據
 */
export function mergeProductData(products) {
  if (!products || !Array.isArray(products) || products.length === 0) {
    return [];
  }
  
  try {
    // 按區域分組產品
    const productsByRegion = {};
    
    // 將使用標準化名稱進行匹配的產品存儲在這裡
    const standardizedProducts = {};
    
    // 步驟 1: 遍歷所有產品，按區域和標準名稱進行分組
    products.forEach(product => {
      const region = product.region;
      
      // 按區域分組
      if (!productsByRegion[region]) {
        productsByRegion[region] = [];
      }
      productsByRegion[region].push(product);
      
      // 如果有標準化名稱，則使用它來合併產品
      if (product.standardName) {
        if (!standardizedProducts[product.standardName]) {
          standardizedProducts[product.standardName] = {
            PRODUCT_NAME: product.name
          };
        }
        
        // 添加區域特定的字段
        standardizedProducts[product.standardName][`SKU_${region}`] = product.sku;
        standardizedProducts[product.standardName][`Price_${region}`] = product.price;
      }
    });
    
    // 步驟 2: 如果有產品沒有標準化名稱，嘗試使用 SKU 進行匹配
    if (products.some(p => !p.standardName)) {
      const skuMap = {};
      
      products.forEach(product => {
        if (!product.standardName && product.sku) {
          // 使用 SKU 作為標識符
          if (!skuMap[product.sku]) {
            skuMap[product.sku] = {
              SKU: product.sku,
              PRODUCT_NAME: product.name
            };
          }
          
          // 添加區域特定的字段
          skuMap[product.sku][`Price_${product.region}`] = product.price;
        }
      });
      
      // 將 SKU 匹配的產品添加到結果中
      Object.values(skuMap).forEach(product => {
        const identifier = `sku_${product.SKU}`;
        standardizedProducts[identifier] = product;
      });
    }
    
    // 步驟 3: 將合併後的產品轉換為數組
    const result = Object.values(standardizedProducts);
    
    // 步驟 4: 添加產品類型
    result.forEach(product => {
      if (product.PRODUCT_NAME && product.PRODUCT_NAME.includes('iPhone')) {
        product.product_type = 'iphone';
      } else if (product.PRODUCT_NAME && product.PRODUCT_NAME.includes('iPad')) {
        product.product_type = 'ipad';
      }
    });
    
    console.log(`Merged ${result.length} products successfully.`);
    return result;
  } catch (error) {
    console.error('Error merging product data:', error);
    return [];
  }
}
