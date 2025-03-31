/**
 * Apple Store Comparison Main JavaScript
 */

// Constants and state
let currentProductType = 'iphone';
let productData = null;
let allData = null;
let filteredProducts = [];
let settings = {
  exchangeRate: 31.5,
  transactionFee: 1.5
};

// API URL configuration
// For local development, use the local Worker URL
// For production, use the current hostname (Worker URL)
const isLocalDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Choose the appropriate API base URL based on environment
let API_BASE_URL;
if (isLocalDevelopment) {
  API_BASE_URL = 'http://localhost:8787';
} else {
  // Use the current hostname (the Worker's domain)
  API_BASE_URL = `https://${window.location.hostname}`;
}

// Path to data files
// For local development, use /api path
// For production, check if data files are in /data or at root
const DATA_PATH = isLocalDevelopment ? '/api' : '/data';

// Log configuration for debugging
console.log(`Using API_BASE_URL: ${API_BASE_URL}`);
console.log(`Using DATA_PATH: ${DATA_PATH}`);

// DOM elements
const productTable = document.getElementById('product-table');
const productTableBody = document.getElementById('product-table-body');
const productCount = document.getElementById('product-count');
const lastUpdated = document.getElementById('last-updated');
const avgPriceDiff = document.getElementById('avg-price-diff');
const avgPriceDiffFee = document.getElementById('avg-price-diff-fee');
const feeInfo = document.getElementById('fee-info');
const searchInput = document.getElementById('search-input');
const btnIPhone = document.getElementById('btn-iphone');
const btnIPad = document.getElementById('btn-ipad');
const btnThemeToggle = document.getElementById('btn-theme-toggle');
const settingsForm = document.getElementById('settings-form');
const exchangeRateInput = document.getElementById('exchange-rate');
const transactionFeeInput = document.getElementById('transaction-fee');
const saveSettingsBtn = document.getElementById('save-settings');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadSettings();
  loadData();
  setupEventListeners();
});

/**
 * Initialize theme based on user preference
 */
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.setAttribute('data-bs-theme', 'dark');
    updateThemeToggleIcon(true);
  } else {
    document.documentElement.setAttribute('data-bs-theme', 'light');
    updateThemeToggleIcon(false);
  }
}

/**
 * Update theme toggle icon
 * @param {boolean} isDark - Whether the current theme is dark
 */
function updateThemeToggleIcon(isDark) {
  btnThemeToggle.innerHTML = isDark
    ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-sun-fill" viewBox="0 0 16 16"><path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/></svg>'
    : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-moon-stars-fill" viewBox="0 0 16 16"><path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/><path d="M10.794 3.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387a1.734 1.734 0 0 0-1.097 1.097l-.387 1.162a.217.217 0 0 1-.412 0l-.387-1.162A1.734 1.734 0 0 0 9.31 6.593l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387a1.734 1.734 0 0 0 1.097-1.097l.387-1.162zM13.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774.258a1.156 1.156 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.156 1.156 0 0 0-.732-.732l-.774-.258a.145.145 0 0 1 0-.274l.774-.258a1.156 1.156 0 0 0 .732-.732l.258-.774z"/></svg>';
}

/**
 * Load user settings from local storage
 */
function loadSettings() {
  const savedSettings = localStorage.getItem('appleStoreComparisonSettings');
  
  if (savedSettings) {
    try {
      const parsedSettings = JSON.parse(savedSettings);
      settings = { ...settings, ...parsedSettings };
      
      // Update form inputs
      exchangeRateInput.value = settings.exchangeRate;
      transactionFeeInput.value = settings.transactionFee;
      
      // Update fee info text
      feeInfo.textContent = `Including ${settings.transactionFee}% foreign transaction fee`;
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }
}

/**
 * Save user settings to local storage
 */
function saveSettings() {
  settings.exchangeRate = parseFloat(exchangeRateInput.value);
  settings.transactionFee = parseFloat(transactionFeeInput.value);
  
  localStorage.setItem('appleStoreComparisonSettings', JSON.stringify(settings));
  
  // Update fee info text
  feeInfo.textContent = `Including ${settings.transactionFee}% foreign transaction fee`;
  
  // Recalculate and redisplay data
  if (productData) {
    recalculateData();
    displayProducts(filteredProducts);
    updateSummaryStats();
  }
  
  // Show saved notification
  showSettingsSaved();
}

/**
 * Show settings saved notification
 */
function showSettingsSaved() {
  // Create notification if it doesn't exist
  let notification = document.querySelector('.settings-saved');
  
  if (!notification) {
    notification = document.createElement('div');
    notification.className = 'settings-saved';
    notification.textContent = 'Settings saved!';
    document.body.appendChild(notification);
  }
  
  // Show notification
  notification.classList.add('show');
  
  // Hide after 2 seconds
  setTimeout(() => {
    notification.classList.remove('show');
  }, 2000);
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Product type selection
  btnIPhone.addEventListener('click', () => {
    if (currentProductType !== 'iphone') {
      currentProductType = 'iphone';
      btnIPhone.classList.add('active');
      btnIPad.classList.remove('active');
      loadProductData();
    }
  });
  
  btnIPad.addEventListener('click', () => {
    if (currentProductType !== 'ipad') {
      currentProductType = 'ipad';
      btnIPad.classList.add('active');
      btnIPhone.classList.remove('active');
      loadProductData();
    }
  });
  
  // Theme toggle
  btnThemeToggle.addEventListener('click', toggleTheme);
  
  // Search
  searchInput.addEventListener('input', filterProducts);
  
  // Settings
  saveSettingsBtn.addEventListener('click', () => {
    saveSettings();
    // Close the modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('settingsModal'));
    modal.hide();
  });
}

/**
 * Toggle between light and dark theme
 */
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-bs-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-bs-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  
  updateThemeToggleIcon(newTheme === 'dark');
}

/**
 * Load data from the API
 */
async function loadData() {
  // Show loading state
  productTableBody.innerHTML = `
    <tr>
      <td colspan="6" class="text-center py-5">
        <div class="loading-spinner mb-3"></div>
        <div>Loading data...</div>
      </td>
    </tr>
  `;
  
  // Try different paths for the data
  const pathsToTry = [
    `${API_BASE_URL}${DATA_PATH}/all.json`,  // First try the data directory
    `${API_BASE_URL}/all.json`,              // Then try the root
    `${API_BASE_URL}/api/all.json`           // Then try the api path
  ];
  
  let success = false;
  let lastError = null;
  
  // Try each path until one works
  for (const path of pathsToTry) {
    try {
      console.log(`Trying to fetch data from: ${path}`);
      
      // Fetch data from API
      const response = await fetch(path);
      
      if (!response.ok) {
        console.log(`Path ${path} returned status: ${response.status}`);
        continue; // Try the next path
      }
      
      // Parse the JSON data
      allData = await response.json();
      
      if (!allData) {
        console.log(`Path ${path} returned invalid data`);
        continue; // Try the next path
      }
      
      console.log(`Successfully loaded data from: ${path}`);
      success = true;
      
      // Load initial data
      loadProductData();
      break; // Exit the loop since we found a working path
      
    } catch (error) {
      console.log(`Error loading from ${path}:`, error.message);
      lastError = error;
      // Continue to the next path
    }
  }
  
  // If all paths failed, show error
  if (!success) {
    console.error('All data loading attempts failed:', lastError);
    productTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-5 text-danger">
          <div class="mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" class="bi bi-exclamation-triangle-fill" viewBox="0 0 16 16">
              <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
            </svg>
          </div>
          <div>Error loading data. Please try again later.</div>
          <div class="text-muted small mt-2">Tried multiple paths but all failed. Last error: ${lastError?.message}</div>
        </td>
      </tr>
    `;
  }
}

/**
 * Load product data based on current product type
 */
function loadProductData() {
  try {
    // Show loading state
    productTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-5">
          <div class="loading-spinner mb-3"></div>
          <div>Loading ${currentProductType} data...</div>
        </td>
      </tr>
    `;
    
    // Reset search
    searchInput.value = '';
    
    // Get data from allData
    if (!allData || !allData[currentProductType]) {
      throw new Error(`No ${currentProductType} data available`);
    }
    
    productData = allData[currentProductType];
    
    // Check if we have valid data
    if (!productData || !productData.products || !Array.isArray(productData.products)) {
      throw new Error('Invalid data format');
    }
    
    // Get exchange rate from data if available
    if (productData.metadata && productData.metadata.exchangeRates && productData.metadata.exchangeRates.TWD) {
      const apiExchangeRate = productData.metadata.exchangeRates.TWD;
      // Only update if user hasn't manually changed it
      if (Math.abs(settings.exchangeRate - apiExchangeRate) > 0.5) {
        settings.exchangeRate = apiExchangeRate;
        exchangeRateInput.value = apiExchangeRate;
        localStorage.setItem('appleStoreComparisonSettings', JSON.stringify(settings));
      }
    }
    
    // Recalculate data with current settings
    recalculateData();
    
    // Display all products initially
    filteredProducts = [...productData.products];
    displayProducts(filteredProducts);
    
    // Update summary statistics
    updateSummaryStats();
    
  } catch (error) {
    console.error('Error loading product data:', error);
    productTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-5 text-danger">
          <div class="mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" class="bi bi-exclamation-triangle-fill" viewBox="0 0 16 16">
              <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
            </svg>
          </div>
          <div>Error loading data. Please try again later.</div>
          <div class="text-muted small mt-2">${error.message}</div>
        </td>
      </tr>
    `;
  }
}

/**
 * Recalculate price differences with current settings
 */
function recalculateData() {
  if (!productData || !productData.products) return;
  
  const { exchangeRate, transactionFee } = settings;
  
  productData.products.forEach(product => {
    // Price difference without fee
    if (product.Price_US && product.Price_TW) {
      const priceTWInUSD = product.Price_TW / exchangeRate;
      const difference = priceTWInUSD - product.Price_US;
      const percentDifference = (difference / product.Price_US) * 100;
      
      product.price_difference_percent = Math.round(percentDifference * 100) / 100;
      product.price_difference_usd = Math.round(difference * 100) / 100;
      
      // Recommendation
      if (percentDifference <= -5) {
        product.recommendation = 'TW';
      } else if (percentDifference >= 5) {
        product.recommendation = 'US';
      } else {
        product.recommendation = 'NEUTRAL';
      }
      
      // With fee
      const priceUSWithFee = product.Price_US * (1 + transactionFee / 100);
      const differenceWithFee = priceTWInUSD - priceUSWithFee;
      const percentDifferenceWithFee = (differenceWithFee / priceUSWithFee) * 100;
      
      product.price_difference_percent_with_fee = Math.round(percentDifferenceWithFee * 100) / 100;
      product.price_difference_usd_with_fee = Math.round(differenceWithFee * 100) / 100;
      
      // Recommendation with fee
      if (percentDifferenceWithFee <= -5) {
        product.recommendation_with_fee = 'TW';
      } else if (percentDifferenceWithFee >= 5) {
        product.recommendation_with_fee = 'US';
      } else {
        product.recommendation_with_fee = 'NEUTRAL';
      }
    }
  });
}

/**
 * Filter products based on search input
 */
function filterProducts() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  
  if (!productData || !productData.products) return;
  
  if (searchTerm === '') {
    filteredProducts = [...productData.products];
  } else {
    filteredProducts = productData.products.filter(product => 
      product.PRODUCT_NAME.toLowerCase().includes(searchTerm)
    );
  }
  
  displayProducts(filteredProducts);
  updateSummaryStats();
}

/**
 * Display products in the table
 * @param {Object[]} products - Products to display
 */
function displayProducts(products) {
  if (!products || products.length === 0) {
    productTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-5">
          <div class="mb-3">No products found.</div>
          <div class="text-muted small">Try adjusting your search criteria.</div>
        </td>
      </tr>
    `;
    return;
  }
  
  productTableBody.innerHTML = products.map(product => {
    const priceUS = product.Price_US ? `$${product.Price_US}` : '-';
    const priceTW = product.Price_TW ? `NT$${product.Price_TW}` : '-';
    
    // Difference column
    let diffHtml = '-';
    if (typeof product.price_difference_percent === 'number') {
      const diffClass = product.price_difference_percent > 0 
        ? 'price-diff-negative' 
        : (product.price_difference_percent < 0 ? 'price-diff-positive' : 'price-diff-neutral');
      
      diffHtml = `
        <span class="${diffClass}">
          ${product.price_difference_percent > 0 ? '+' : ''}${product.price_difference_percent}%
          <small class="d-block">(${product.price_difference_usd > 0 ? '+' : ''}$${product.price_difference_usd})</small>
        </span>
      `;
    }
    
    // With fee column
    let diffFeeHtml = '-';
    if (typeof product.price_difference_percent_with_fee === 'number') {
      const diffFeeClass = product.price_difference_percent_with_fee > 0 
        ? 'price-diff-negative' 
        : (product.price_difference_percent_with_fee < 0 ? 'price-diff-positive' : 'price-diff-neutral');
      
      diffFeeHtml = `
        <span class="${diffFeeClass}">
          ${product.price_difference_percent_with_fee > 0 ? '+' : ''}${product.price_difference_percent_with_fee}%
          <small class="d-block">(${product.price_difference_usd_with_fee > 0 ? '+' : ''}$${product.price_difference_usd_with_fee})</small>
        </span>
      `;
    }
    
    // Recommendation badge
    let recHtml = '-';
    if (product.recommendation_with_fee) {
      const badgeClass = product.recommendation_with_fee === 'US' 
        ? 'badge-us'
        : (product.recommendation_with_fee === 'TW' ? 'badge-tw' : 'badge-neutral');
      
      const recText = product.recommendation_with_fee === 'US' 
        ? 'Buy in US'
        : (product.recommendation_with_fee === 'TW' ? 'Buy in TW' : 'Either');
      
      recHtml = `<span class="badge recommendation-badge ${badgeClass}">${recText}</span>`;
    }
    
    return `
      <tr>
        <td>${product.PRODUCT_NAME}</td>
        <td class="text-nowrap">${priceUS}</td>
        <td class="text-nowrap">${priceTW}</td>
        <td class="text-nowrap">${diffHtml}</td>
        <td class="text-nowrap">${diffFeeHtml}</td>
        <td class="text-center">${recHtml}</td>
      </tr>
    `;
  }).join('');
}

/**
 * Update summary statistics
 */
function updateSummaryStats() {
  // Product count
  productCount.textContent = filteredProducts.length;
  
  // Last updated
  if (allData && allData.lastUpdated) {
    const lastUpdatedDate = new Date(allData.lastUpdated);
    lastUpdated.textContent = `Last updated: ${lastUpdatedDate.toLocaleString()}`;
  } else if (productData && productData.metadata && productData.metadata.lastUpdated) {
    const lastUpdatedDate = new Date(productData.metadata.lastUpdated);
    lastUpdated.textContent = `Last updated: ${lastUpdatedDate.toLocaleString()}`;
  } else {
    lastUpdated.textContent = 'Last updated: Unknown';
  }
  
  // Average price difference
  if (filteredProducts.length > 0) {
    // Without fee
    const validProducts = filteredProducts.filter(p => typeof p.price_difference_percent === 'number');
    if (validProducts.length > 0) {
      const avgDiff = validProducts.reduce((sum, p) => sum + p.price_difference_percent, 0) / validProducts.length;
      const avgDiffRounded = Math.round(avgDiff * 100) / 100;
      
      const diffClass = avgDiff > 0 
        ? 'price-diff-negative' 
        : (avgDiff < 0 ? 'price-diff-positive' : 'price-diff-neutral');
      
      avgPriceDiff.innerHTML = `<span class="${diffClass}">${avgDiffRounded > 0 ? '+' : ''}${avgDiffRounded}%</span>`;
    } else {
      avgPriceDiff.textContent = '-';
    }
    
    // With fee
    const validProductsFee = filteredProducts.filter(p => typeof p.price_difference_percent_with_fee === 'number');
    if (validProductsFee.length > 0) {
      const avgDiffFee = validProductsFee.reduce((sum, p) => sum + p.price_difference_percent_with_fee, 0) / validProductsFee.length;
      const avgDiffFeeRounded = Math.round(avgDiffFee * 100) / 100;
      
      const diffFeeClass = avgDiffFee > 0 
        ? 'price-diff-negative' 
        : (avgDiffFee < 0 ? 'price-diff-positive' : 'price-diff-neutral');
      
      avgPriceDiffFee.innerHTML = `<span class="${diffFeeClass}">${avgDiffFeeRounded > 0 ? '+' : ''}${avgDiffFeeRounded}%</span>`;
    } else {
      avgPriceDiffFee.textContent = '-';
    }
  } else {
    avgPriceDiff.textContent = '-';
    avgPriceDiffFee.textContent = '-';
  }
}
