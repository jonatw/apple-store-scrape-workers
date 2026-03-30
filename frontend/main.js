// CSS: tree-shaken Bootstrap + app styles (Vite extracts to separate CSS file in production)
import './scss/custom-bootstrap.scss';
import './css/styles.css';

// Bootstrap JS: only import the components we actually use
import 'bootstrap/js/dist/collapse';

// ==================== App Code ====================

/**
 * Apple Store Price Comparison — Frontend
 * TWD-based price comparison matching Python reference implementation.
 */

// State
let currentProduct = 'iphone';
let productData = null;
let allData = null;
let exchangeRate = 31.5;
let cardFee = 1.5;

// API configuration
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = isLocal ? 'http://localhost:8787' : `https://${window.location.hostname}`;

// ==================== Theme ====================

function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved) {
    document.documentElement.setAttribute('data-bs-theme', saved);
    updateThemeIcon(saved);
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = prefersDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-bs-theme', theme);
    updateThemeIcon(theme);
  }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      const t = e.matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-bs-theme', t);
      updateThemeIcon(t);
    }
  });

  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('theme-icon');
  if (theme === 'dark') {
    icon.innerHTML = '<path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/>';
  } else {
    icon.innerHTML = '<path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/>';
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-bs-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-bs-theme', next);
  localStorage.setItem('theme', next);
  updateThemeIcon(next);
}

// ==================== Formatting ====================

function formatCurrency(amount, currency) {
  if (amount === null || amount === undefined || amount === 0) return '-';
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPercentage(value) {
  if (value === null || value === undefined) return '-';
  return `${value > 0 ? '+' : ''}${value}%`;
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ==================== Price Calculation (TWD-based) ====================

function calculateUSPriceWithFee(usdPrice) {
  if (!usdPrice) return 0;
  return usdPrice * (1 + cardFee / 100) * exchangeRate;
}

function calculatePriceStats(products) {
  if (!products || products.length === 0) {
    return { avg: 0, avgWithFee: 0 };
  }

  const diffs = products.map(p => {
    const usd = p.Price_US || 0;
    const twd = p.Price_TW || 0;
    if (usd <= 0 || twd <= 0) return null;
    const usdTWD = usd * exchangeRate;
    return ((twd - usdTWD) / usdTWD) * 100;
  }).filter(d => d !== null);

  const diffsWithFee = products.map(p => {
    const usd = p.Price_US || 0;
    const twd = p.Price_TW || 0;
    if (usd <= 0 || twd <= 0) return null;
    const usdFeeTWD = calculateUSPriceWithFee(usd);
    return ((twd - usdFeeTWD) / usdFeeTWD) * 100;
  }).filter(d => d !== null);

  const avg = diffs.length > 0 ? diffs.reduce((a, b) => a + b, 0) / diffs.length : 0;
  const avgWithFee = diffsWithFee.length > 0 ? diffsWithFee.reduce((a, b) => a + b, 0) / diffsWithFee.length : 0;

  return { avg, avgWithFee };
}

// ==================== Settings ====================

function initSettings() {
  const exchangeRateInput = document.getElementById('exchange-rate');
  const cardFeeInput = document.getElementById('card-fee');
  const settingsBadge = document.getElementById('settings-changed');

  const saved = localStorage.getItem('price-settings');
  if (saved) {
    const s = JSON.parse(saved);
    exchangeRate = s.exchangeRate || 31.5;
    cardFee = s.cardFee || 1.5;
    exchangeRateInput.value = exchangeRate;
    cardFeeInput.value = cardFee;
  }

  function updateSettings() {
    const newRate = parseFloat(exchangeRateInput.value);
    const newFee = parseFloat(cardFeeInput.value);
    if (isNaN(newRate) || isNaN(newFee) || newRate <= 0 || newFee < 0) return;

    const changed = (exchangeRate !== newRate || cardFee !== newFee);
    exchangeRate = newRate;
    cardFee = newFee;

    localStorage.setItem('price-settings', JSON.stringify({ exchangeRate, cardFee }));

    if (changed) {
      settingsBadge.style.display = 'inline-block';
      setTimeout(() => { settingsBadge.style.display = 'none'; }, 3000);

      if (productData) {
        renderProductTable(productData.products);
        updateSummaryStats(productData);
      }
    }
  }

  exchangeRateInput.addEventListener('change', updateSettings);
  cardFeeInput.addEventListener('change', updateSettings);
}

// ==================== Data Loading ====================

async function loadAllData() {
  try {
    const url = `${API_BASE}/api/all.json`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Status: ${resp.status}`);
    allData = await resp.json();
  } catch (err) {
    console.error('Failed to load data:', err);
    const tbody = document.querySelector('#products-table tbody');
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-danger">Error loading data: ${err.message}</td></tr>`;
  }
}

async function navigateTo(product) {
  currentProduct = product;

  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.product === product);
  });

  const names = { iphone: 'iPhone', ipad: 'iPad', mac: 'Mac', watch: 'Watch', airpods: 'AirPods', tvhome: 'TV & Home' };
  document.getElementById('page-title').textContent = `Apple ${names[product] || product} Price Comparison`;

  const tbody = document.querySelector('#products-table tbody');
  tbody.innerHTML = `<tr><td colspan="6" class="loading"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></td></tr>`;

  if (!allData) await loadAllData();
  if (!allData || !allData[product]) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-3">No ${product} data available</td></tr>`;
    return;
  }

  productData = allData[product];

  if (productData.metadata && productData.metadata.exchangeRates && productData.metadata.exchangeRates.TWD) {
    const apiRate = productData.metadata.exchangeRates.TWD;
    const savedSettings = localStorage.getItem('price-settings');
    if (!savedSettings) {
      exchangeRate = apiRate;
      document.getElementById('exchange-rate').value = apiRate;
    }
  }

  if (productData.metadata && productData.metadata.lastExchangeRateUpdate) {
    const rateDate = formatDate(productData.metadata.lastExchangeRateUpdate);
    const info = document.getElementById('exchange-rate-info');
    if (info) info.textContent = `Current rate from Cathay Bank (updated: ${rateDate})`;
  }

  renderProductTable(productData.products);
  updateSummaryStats(productData);

  const searchInput = document.getElementById('product-search');
  if (searchInput) searchInput.value = '';
}

// ==================== Rendering ====================

function renderProductTable(products) {
  const tbody = document.querySelector('#products-table tbody');
  tbody.innerHTML = '';

  if (!products || products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-3">No product data found</td></tr>`;
    return;
  }

  products.forEach(product => {
    const row = document.createElement('tr');

    const usdPrice = product.Price_US || 0;
    const twdPrice = product.Price_TW || 0;
    const usdWithFeeTWD = calculateUSPriceWithFee(usdPrice);

    const diff = (twdPrice > 0 && usdWithFeeTWD > 0)
      ? ((twdPrice - usdWithFeeTWD) / usdWithFeeTWD) * 100
      : 0;

    const diffClass = diff > 0 ? 'price-higher' : diff < 0 ? 'price-lower' : '';

    let recBadge = 'No Data';
    let recClass = 'bg-secondary';
    if (usdPrice > 0 && twdPrice > 0) {
      if (diff > 2) { recBadge = 'Buy in US'; recClass = 'bg-danger'; }
      else if (diff < -2) { recBadge = 'Buy in Taiwan'; recClass = 'bg-success'; }
      else { recBadge = 'Similar'; recClass = 'bg-info'; }
    }

    const nameCell = document.createElement('td');
    nameCell.textContent = product.PRODUCT_NAME;

    if (currentProduct === 'mac') {
      const specs = [];
      if (product.Chip) specs.push(product.Chip);
      if (product.Memory) specs.push(product.Memory);
      if (product.Storage) specs.push(product.Storage);
      if (product.CPU_Cores && product.GPU_Cores) {
        specs.push(`${product.CPU_Cores}C CPU / ${product.GPU_Cores}C GPU`);
      }
      if (specs.length > 0) {
        const specEl = document.createElement('small');
        specEl.className = 'text-muted d-block';
        specEl.textContent = specs.join(' \u2022 ');
        nameCell.appendChild(specEl);
      }
    }

    const usPriceCell = document.createElement('td');
    usPriceCell.textContent = formatCurrency(usdPrice, 'USD');

    const usFeeCell = document.createElement('td');
    usFeeCell.className = 'd-none d-md-table-cell';
    usFeeCell.textContent = formatCurrency(usdWithFeeTWD, 'TWD');

    const twPriceCell = document.createElement('td');
    twPriceCell.textContent = formatCurrency(twdPrice, 'TWD');

    const diffCell = document.createElement('td');
    diffCell.className = diffClass;
    diffCell.textContent = (usdPrice > 0 && twdPrice > 0) ? formatPercentage(diff.toFixed(1)) : '-';

    const recCell = document.createElement('td');
    recCell.className = 'd-none d-md-table-cell';
    const badge = document.createElement('span');
    badge.className = `badge ${recClass}`;
    badge.textContent = recBadge;
    recCell.appendChild(badge);

    row.appendChild(nameCell);
    row.appendChild(usPriceCell);
    row.appendChild(usFeeCell);
    row.appendChild(twPriceCell);
    row.appendChild(diffCell);
    row.appendChild(recCell);

    tbody.appendChild(row);
  });
}

function updateSummaryStats(data) {
  if (!data || !data.products) return;

  document.getElementById('total-products').textContent = data.products.length;

  const stats = calculatePriceStats(data.products);

  const avgDiffEl = document.getElementById('avg-diff');
  avgDiffEl.textContent = formatPercentage(stats.avg.toFixed(1));
  avgDiffEl.className = 'card-text display-4 ' + (stats.avg > 0 ? 'price-higher' : 'price-lower');

  const avgFeeEl = document.getElementById('avg-diff-with-fee');
  avgFeeEl.textContent = formatPercentage(stats.avgWithFee.toFixed(1));
  avgFeeEl.className = 'card-text display-4 ' + (stats.avgWithFee > 0 ? 'price-higher' : 'price-lower');

  const lastUpdatedEl = document.getElementById('last-updated');
  lastUpdatedEl.textContent = formatDate(data.metadata?.lastUpdated || allData?.lastUpdated);
}

// ==================== Search ====================

function setupSearch() {
  const searchInput = document.getElementById('product-search');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    if (!productData || !productData.products) return;

    const filtered = term === ''
      ? productData.products
      : productData.products.filter(p => p.PRODUCT_NAME.toLowerCase().includes(term));

    renderProductTable(filtered);
  });
}

// ==================== Navigation ====================

function setupNavigation() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.hash = e.target.dataset.product;
    });
  });

  window.addEventListener('hashchange', () => {
    const product = window.location.hash.slice(1) || 'iphone';
    if (product !== currentProduct) {
      navigateTo(product);
    }
  });
}

// ==================== Init ====================

async function init() {
  initTheme();
  initSettings();

  const validProducts = ['iphone', 'ipad', 'mac', 'watch', 'airpods', 'tvhome'];
  const hashProduct = window.location.hash.slice(1);
  if (hashProduct && validProducts.includes(hashProduct)) {
    currentProduct = hashProduct;
  }

  setupSearch();
  setupNavigation();

  await navigateTo(currentProduct);
}

window.addEventListener('DOMContentLoaded', init);
