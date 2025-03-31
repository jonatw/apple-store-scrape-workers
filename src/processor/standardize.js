/**
 * 產品名稱標準化模塊
 * 將不同區域的產品名稱標準化，以便於匹配
 */

/**
 * 標準化產品名稱
 * @param {string} name - 原始產品名稱
 * @returns {string} - 標準化後的產品名稱
 */
export function standardizeProductName(name) {
  if (!name) return '';
  
  try {
    // 提取型號（例如 iPhone 16 Pro -> iphone16pro）
    const modelMatch = name.match(/iPhone (\d+)( Pro)?/i);
    if (!modelMatch) return '';
    const model = `iphone${modelMatch[1]}${modelMatch[2] ? 'pro' : ''}`;
    
    // 提取容量（例如 128GB -> 128gb）
    const capacityMatch = name.match(/(\d+)GB/i);
    if (!capacityMatch) return '';
    const capacity = `${capacityMatch[1].toLowerCase()}gb`;
    
    // 提取顏色（例如 Black Titanium -> blacktitanium）
    const colorMatch = name.match(/(Black|White|Blue|Purple|Yellow|Green|Red|Gold|Silver|Gray|Natural|Titanium|Aluminium|Midnight|Starlight) ?(?:Titanium)?/i);
    if (!colorMatch) return '';
    const color = colorMatch[1].toLowerCase().replace(/\s+/g, '');
    
    // 返回標準化名稱（型號_容量_顏色）
    return `${model}_${capacity}_${color}`;
  } catch (error) {
    console.error('Error standardizing product name:', error);
    return '';
  }
}
