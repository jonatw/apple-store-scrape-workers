/**
 * 匯率數據抓取模塊
 */

import { DEFAULT_EXCHANGE_RATE } from '../config';

/**
 * 抓取匯率數據
 * @returns {Promise<number>} - USD/TWD 匯率
 */
export async function fetchExchangeRate() {
  try {
    const url = 'https://accessibility.cathaybk.com.tw/exchange-rate-search.aspx';
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    
    // 使用正則表達式從國泰銀行網站提取美元匯率
    const rateRegex = /<tr>[\s\S]*?美元\(USD\)[\s\S]*?<td[^>]*>([\d.]+)<\/td>[\s\S]*?<td[^>]*>([\d.]+)<\/td>/i;
    const match = html.match(rateRegex);
    
    if (!match || !match[2]) {
      throw new Error('Exchange rate not found');
    }
    
    const rate = parseFloat(match[2]);
    
    if (isNaN(rate) || rate <= 0) {
      throw new Error('Invalid exchange rate value');
    }
    
    console.log(`Fetched USD/TWD exchange rate: ${rate}`);
    return rate;
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    console.log(`Using default exchange rate: ${DEFAULT_EXCHANGE_RATE}`);
    return DEFAULT_EXCHANGE_RATE;
  }
}
