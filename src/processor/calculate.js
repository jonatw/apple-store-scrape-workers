/**
 * 價格差異計算模塊
 * 以台幣 (TWD) 為基準計算價格差異
 */

/**
 * 計算產品價格差異和推薦（不含手續費）
 * 將美金轉換為台幣後比較
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

      // 將美金價格轉換為台幣
      const priceUSInTWD = priceUS * exchangeRate;

      // 計算價格差異百分比（台灣與美國的差異，以台幣為基準）
      // 正值表示台灣更貴，負值表示台灣更便宜
      if (priceUS > 0 && priceTW > 0) {
        const difference = priceTW - priceUSInTWD;
        const percentDifference = (difference / priceUSInTWD) * 100;

        // 四捨五入到一位小數
        newProduct.price_difference_percent = Math.round(percentDifference * 10) / 10;
        newProduct.price_difference_twd = Math.round(difference);
        newProduct.Price_US_TWD = Math.round(priceUSInTWD);

        // 添加推薦字段（2% 門檻）
        if (percentDifference > 2) {
          // 台灣更貴，推薦在美國買
          newProduct.recommendation = 'US';
        } else if (percentDifference < -2) {
          // 台灣更便宜，推薦在台灣買
          newProduct.recommendation = 'TW';
        } else {
          // 價格差異不大
          newProduct.recommendation = 'SIMILAR';
        }
      }

      return newProduct;
    });

    return result;
  } catch (error) {
    console.error('Error calculating price differences:', error);
    return products;
  }
}

/**
 * 計算包含外幣交易手續費的價格差異
 * 將美金價格加上手續費後轉換為台幣再比較
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
    exchangeRate = 31.5;
  }

  try {
    const result = products.map(product => {
      const newProduct = { ...product };

      const priceUS = typeof product.Price_US === 'number' ? product.Price_US : 0;
      const priceTW = typeof product.Price_TW === 'number' ? product.Price_TW : 0;

      // 將美金價格加上手續費後轉換為台幣
      const priceUSWithFeeTWD = priceUS * (1 + feePercent / 100) * exchangeRate;

      if (priceUS > 0 && priceTW > 0) {
        const difference = priceTW - priceUSWithFeeTWD;
        const percentDifference = (difference / priceUSWithFeeTWD) * 100;

        newProduct.price_difference_percent_with_fee = Math.round(percentDifference * 10) / 10;
        newProduct.price_difference_twd_with_fee = Math.round(difference);
        newProduct.Price_US_with_fee_TWD = Math.round(priceUSWithFeeTWD);

        // 含手續費推薦（2% 門檻）
        if (percentDifference > 2) {
          newProduct.recommendation_with_fee = 'US';
        } else if (percentDifference < -2) {
          newProduct.recommendation_with_fee = 'TW';
        } else {
          newProduct.recommendation_with_fee = 'SIMILAR';
        }
      }

      return newProduct;
    });

    return result;
  } catch (error) {
    console.error('Error calculating price differences with fee:', error);
    return products;
  }
}
