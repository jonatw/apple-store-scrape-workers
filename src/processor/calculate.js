/**
 * 價格差異計算模塊
 */

/**
 * 計算產品價格差異和推薦
 * @param {Object[]} products - 產品列表
 * @param {number} exchangeRate - USD/TWD 匯率
 * @returns {Object[]} - 帶有價格差異計算的產品列表
 */
export function calculatePriceDifferences(products, exchangeRate) {
  if (!products || !Array.isArray(products) || products.length === 0) {
    return [];
  }
  
  if (!exchangeRate || exchangeRate <= 0) {
    exchangeRate = 31.5; // 默認匯率
  }
  
  try {
    const result = products.map(product => {
      const newProduct = { ...product };
      
      // 確保價格是數字
      const priceUS = typeof product.Price_US === 'number' ? product.Price_US : 0;
      const priceTW = typeof product.Price_TW === 'number' ? product.Price_TW : 0;
      
      // 計算台灣價格轉換為美元
      const priceTWInUSD = priceTW / exchangeRate;
      
      // 計算價格差異百分比 (台灣與美國的差異)
      // 正值表示台灣更貴，負值表示美國更貴
      if (priceUS > 0 && priceTWInUSD > 0) {
        const difference = priceTWInUSD - priceUS;
        const percentDifference = (difference / priceUS) * 100;
        
        // 四捨五入到兩位小數
        newProduct.price_difference_percent = Math.round(percentDifference * 100) / 100;
        newProduct.price_difference_usd = Math.round(difference * 100) / 100;
        
        // 添加推薦字段
        if (percentDifference <= -5) {
          // 台灣價格至少便宜 5%
          newProduct.recommendation = 'TW';
        } else if (percentDifference >= 5) {
          // 美國價格至少便宜 5%
          newProduct.recommendation = 'US';
        } else {
          // 價格差異不大
          newProduct.recommendation = 'NEUTRAL';
        }
      }
      
      return newProduct;
    });
    
    return result;
  } catch (error) {
    console.error('Error calculating price differences:', error);
    return products; // 返回原始產品列表，沒有計算
  }
}

/**
 * 計算包含外幣交易手續費的價格差異
 * @param {Object[]} products - 產品列表
 * @param {number} exchangeRate - USD/TWD 匯率
 * @param {number} feePercent - 外幣交易手續費百分比
 * @returns {Object[]} - 帶有價格差異計算的產品列表
 */
export function calculatePriceDifferencesWithFee(products, exchangeRate, feePercent = 1.5) {
  if (!products || !Array.isArray(products) || products.length === 0) {
    return [];
  }
  
  if (!exchangeRate || exchangeRate <= 0) {
    exchangeRate = 31.5; // 默認匯率
  }
  
  try {
    const result = products.map(product => {
      const newProduct = { ...product };
      
      // 確保價格是數字
      const priceUS = typeof product.Price_US === 'number' ? product.Price_US : 0;
      const priceTW = typeof product.Price_TW === 'number' ? product.Price_TW : 0;
      
      // 計算台灣價格轉換為美元
      const priceTWInUSD = priceTW / exchangeRate;
      
      // 計算包含手續費的美國價格
      const priceUSWithFee = priceUS * (1 + feePercent / 100);
      
      // 計算價格差異百分比 (台灣與含手續費的美國價格比較)
      if (priceUSWithFee > 0 && priceTWInUSD > 0) {
        const difference = priceTWInUSD - priceUSWithFee;
        const percentDifference = (difference / priceUSWithFee) * 100;
        
        // 四捨五入到兩位小數
        newProduct.price_difference_percent_with_fee = Math.round(percentDifference * 100) / 100;
        newProduct.price_difference_usd_with_fee = Math.round(difference * 100) / 100;
        
        // 添加包含手續費的推薦字段
        if (percentDifference <= -5) {
          // 台灣價格至少便宜 5%
          newProduct.recommendation_with_fee = 'TW';
        } else if (percentDifference >= 5) {
          // 美國價格至少便宜 5%
          newProduct.recommendation_with_fee = 'US';
        } else {
          // 價格差異不大
          newProduct.recommendation_with_fee = 'NEUTRAL';
        }
      }
      
      return newProduct;
    });
    
    return result;
  } catch (error) {
    console.error('Error calculating price differences with fee:', error);
    return products; // 返回原始產品列表，沒有計算
  }
}
