/* =========================================================
   PIIS — Personal Investment Intelligence System
   Frontend application logic
   ========================================================= */

(() => {
  'use strict';

  // ---------- State ----------
  const STATE_KEY = 'piis:v1:state';
  const THEME_KEY = 'piis:v1:theme';
  const BRIEFING_KEY = 'piis:v1:briefing';

  const state = {
    portfolio: [],          // [{id, name, qty, avgPrice, thesis, status, confidence, history:[]}]
    transactions: [],       // [{id, ts, type, stock, qty, price, thesis, ...}]
    briefing: null,         // {date, data, sources}
  };

  const ui = {};            // DOM refs
  const charts = {};        // Chart.js instances

  // Sample portfolio
  const SAMPLE = [
    { name: 'BHARAT ELECTRONICS', qty: 96, avgPrice: 231, thesis: 'Unmatched Revenue Visibility. Margin resilience. Defence tailwinds.' },
    { name: 'MAHINDRA & MAHINDRA', qty: 12, avgPrice: 1547, thesis: 'Structural Leadership in Core Segments & EV Value Unlocking' },
    { name: 'SONACOMS', qty: 29, avgPrice: 570, thesis: 'Global EV Penetration, Technological moat. Efficient capital allocation.' },
    { name: 'ICICI BANK', qty: 32, avgPrice: 670, thesis: 'Strong ROE & ROA. Best in class asset quality.' },
    { name: 'KEI INDUSTRIES', qty: 2, avgPrice: 3717, thesis: 'Shift to High-Margin Retail, Sectoral tailwinds, export momentum.' },
    { name: 'KIRLOSKAR OIL ENGINE', qty: 6, avgPrice: 1164, thesis: 'HHP Volume Growth & Margin Expansion, Regulatory moat, defensive aftermarket & export.' },
    { name: 'PIDILITE INDUSTRIES', qty: 13, avgPrice: 2260, thesis: 'Unmatched Brand Equity and "Sticky" Moats, high quality balance sheet, structural tailwinds.' },
    { name: 'ASHOKA BUILDCON', qty: 23, avgPrice: 208, thesis: 'Balance Sheet Deleveraging & Asset Monetization, robust order book.' },
    { name: 'BLUE STAR', qty: 4, avgPrice: 1719, thesis: 'Structural Multi-Decade Runaway, CR rebound, B2B engineering and project strength.' },
    { name: 'CAMS', qty: 6, avgPrice: 2948, thesis: 'Structural Growth Proxy, Market Moat, Capital-light business model.' },
    { name: 'SCHNEIDER ELECTRIC', qty: 4, avgPrice: 715, thesis: 'AI and Data Center Tailwinds, digital fly-wheel, margin expansion, electrification super cycle.' },
    { name: 'KAYNES TECH', qty: 6, avgPrice: 1422, thesis: 'High-Margin Niche Focus, Backward integration & OSAT, Policy & mfg tailwinds.' },
    { name: 'IRCON', qty: 110, avgPrice: 285, thesis: 'Robust Revenue Visibility, National CAPEX momentum, Financial Strength.' },
    { name: '360 ONE WAM', qty: 37, avgPrice: 758, thesis: 'High-Visibility Recurring Revenue, Deep Moat in Alternative Assets, Superior Operating Leverage.' },
    { name: 'VARUN BEVERAGES', qty: 39, avgPrice: 502, thesis: 'Structural Under-Consumption in Core Markets, High-Margin Portfolio Mix, Geographic Expansion, Operating leverage.' },
    { name: 'FORTIS HEALTH CARE', qty: 8, avgPrice: 660, thesis: 'Rising ARPOB, occupancy gains, diagnostic recovery.' },
    { name: 'ITC HOTELS', qty: 44, avgPrice: 168, thesis: 'Asset-Right Expansion Strategy, Scalable brand equity, stable cash flow, high margin.' },
    { name: 'KALPATARU INFRA', qty: 8, avgPrice: 1037, thesis: 'Robust Multi-Year Visibility, Power T&D tailwinds, Balance Sheet Strength, Geographical diversification.' },
    { name: 'HDFC LIFE', qty: 27, avgPrice: 616, thesis: 'Massive Underinsurance & Secular Growth, Premier Distribution Network, Industry-Leading Profitability (VNB Margins).' },
    { name: 'TATA STEEL', qty: 215, avgPrice: 108, thesis: 'Rapid Indian Volume Growth, European Turnaround & Decarbonization, CBAM Tailwinds.' },
    { name: 'HCL TECH', qty: 12, avgPrice: 1521, thesis: 'Robust Capital Allocation, AI Leadership and Next-Gen Services, Service Portfolio and IP-Led Differentiation.' },
    { name: 'SAREGAMA', qty: 20, avgPrice: 460, thesis: 'Shift to Paid Streaming, Defensive Music IP & High Margins, Aggressive New Content Acquisition.' },
    { name: 'CAPLIN POINT LAB', qty: 5, avgPrice: 1059, thesis: 'Dominant Foothold in Emerging Markets, High-Margin US Injectables, Best-in-Class Financial Profile, Capex Expansion.' },
    { name: 'NTPC', qty: 46, avgPrice: 344, thesis: 'Regulated Cash Flows (Moat), Massive Green Energy investment, Dominant Market Position, Sectoral tailwinds.' },
    { name: 'V2R', qty: 3, avgPrice: 1702, thesis: 'Aggressive, Cluster-Led Expansion, Best-in-Class Unit Economics, Untapped Demographic Shift.' },
    { name: 'BHARTI AIRTEL', qty: 6, avgPrice: 1810, thesis: 'Industry Consolidation & Pricing Power, Superior Capital Allocation, Strong African Operations.' },
  ];

  // ---------- Sector classification ----------
  // Lightweight keyword-based sector mapper for Indian-listed stocks.
  const SECTOR_RULES = [
    { sector: 'Defence', keywords: ['bharat electronics', 'bel ', 'hindustan aeronautics', 'mazagon', 'mishra dhatu', 'cochin ship', 'garden reach', 'data patterns', 'mtar', 'paras defence', 'astra micro'] },
    { sector: 'Auto & Mobility', keywords: ['mahindra & mahindra', 'tata motors', 'maruti', 'bajaj auto', 'hero moto', 'eicher', 'tvs motor', 'ashok leyland', 'force motors', 'm&m '] },
    { sector: 'Auto Components', keywords: ['sona', 'samvardhana', 'bosch', 'motherson', 'minda', 'endurance', 'bharat forge', 'exide', 'amara raja', 'apollo tyres', 'mrf', 'jk tyre', 'ceat'] },
    { sector: 'Banks', keywords: ['icici bank', 'hdfc bank', 'sbi', 'kotak', 'axis bank', 'indusind', 'federal bank', 'idfc', 'bandhan', 'au small', 'rbl bank', 'yes bank', 'pnb', 'canara', 'bank of baroda'] },
    { sector: 'NBFC & Capital Markets', keywords: ['cams', '360 one', 'iifl', 'bajaj finance', 'cholamandalam', 'shriram', 'muthoot', 'manappuram', 'angel one', 'motilal oswal', 'nuvama', 'bse ', 'mcx', 'cdsl', 'kfin'] },
    { sector: 'Insurance', keywords: ['hdfc life', 'sbi life', 'icici prudential', 'icici lombard', 'star health', 'max financial', 'lic '] },
    { sector: 'Cables & Electricals', keywords: ['kei industries', 'polycab', 'havells', 'finolex', 'rr kabel', 'schneider electric', 'siemens', 'abb', 'cg power', 'thermax', 'voltamp'] },
    { sector: 'Engineering & Capital Goods', keywords: ['l&t', 'larsen', 'kirloskar', 'bharat heavy', 'bhel', 'cummins', 'blue star', 'voltas', 'crompton', 'praj', 'isgec', 'elgi', 'grindwell', 'sks'] },
    { sector: 'Infrastructure & Construction', keywords: ['ashoka build', 'ircon', 'kalpataru', 'rvnl', 'irb', 'pnc infra', 'ksh international', 'ksb', 'ge t&d', 'hg infra', 'g r infra', 'ncc ', 'kalpataru power', 'kalpataru projects'] },
    { sector: 'Power & Utilities', keywords: ['ntpc', 'power grid', 'tata power', 'jsw energy', 'adani power', 'adani green', 'nhpc', 'sjvn', 'torrent power', 'reliance power', 'cesc', 'ngel'] },
    { sector: 'Consumer Staples', keywords: ['pidilite', 'hindustan unilever', 'hul', 'nestle', 'britannia', 'dabur', 'marico', 'colgate', 'godrej consumer', 'itc ', 'tata consumer', 'emami', 'gillette', 'p&g'] },
    { sector: 'Consumer Discretionary', keywords: ['varun beverages', 'titan', 'v2r', 'v2 retail', 'trent', 'asian paints', 'pidilite', 'page industries', 'jubilant food', 'devyani', 'zomato', 'naukri', 'info edge', 'nykaa', 'mankind'] },
    { sector: 'Hospitality & Travel', keywords: ['itc hotels', 'indian hotels', 'lemon tree', 'eih', 'chalet hotels', 'samhi', 'mahindra holidays', 'thomas cook', 'irctc', 'easy trip', 'interglobe'] },
    { sector: 'Healthcare & Pharma', keywords: ['fortis', 'apollo hospitals', 'max healthcare', 'narayana', 'krsnaa', 'medanta', 'dr lal', 'metropolis', 'thyrocare', 'sun pharma', 'cipla', 'dr reddy', 'lupin', 'aurobindo', 'caplin', 'divi', 'biocon', 'natco', 'glenmark', 'ipca', 'mankind', 'torrent pharma', 'alkem', 'ajanta'] },
    { sector: 'Information Technology', keywords: ['hcl tech', 'tcs', 'infosys', 'wipro', 'tech mahindra', 'lti', 'mphasis', 'persistent', 'coforge', 'birlasoft', 'mindtree', 'kpit', 'l&t tech', 'happiest minds', 'oracle financial', 'newgen'] },
    { sector: 'Media & Entertainment', keywords: ['saregama', 'tips industries', 'tips music', 'pvr', 'inox', 'zee ', 'sun tv', 'network18', 'tv18', 'nazara', 'delta corp'] },
    { sector: 'Metals & Mining', keywords: ['tata steel', 'jsw steel', 'jindal steel', 'sail', 'nmdc', 'hindalco', 'vedanta', 'hindustan zinc', 'nalco', 'moil', 'apl apollo', 'jindal saw'] },
    { sector: 'Telecom', keywords: ['bharti airtel', 'reliance jio', 'vodafone', 'idea', 'tata communication', 'indus tower', 'gtl', 'tejas networks'] },
    { sector: 'Electronics & EMS', keywords: ['kaynes', 'syrma', 'dixon', 'amber enterprise', 'cyient', 'vinati', 'rajesh exports', 'voltamp', 'optiemus'] },
    { sector: 'Oil & Gas', keywords: ['reliance industries', 'ongc', 'ioc', 'bpcl', 'hpcl', 'gail', 'oil india', 'gujarat gas', 'igl', 'mgl', 'petronet'] },
    { sector: 'Chemicals', keywords: ['srf ', 'aarti industries', 'navin fluorine', 'deepak nitrite', 'tata chemicals', 'pi industries', 'upl ', 'gujarat fluoro', 'jubilant pharmova', 'gnfc', 'gsfc', 'rallis', 'sharda cropchem', 'pcbl', 'epigral', 'borosil', 'fine organic'] },
    { sector: 'Cement', keywords: ['ultratech', 'shree cement', 'ambuja', 'acc ', 'dalmia', 'india cements', 'birla corp', 'jk cement', 'ramco cements'] },
    { sector: 'Real Estate', keywords: ['dlf ', 'godrej properties', 'oberoi realty', 'macrotech', 'prestige estate', 'brigade enterprise', 'sobha', 'phoenix mills', 'sunteck', 'mahindra lifespace'] },
  ];

  function classifySector(name) {
    const lower = name.toLowerCase();
    for (const rule of SECTOR_RULES) {
      if (rule.keywords.some(k => lower.includes(k))) return rule.sector;
    }
    return 'Other';
  }

  // Stable palette for sectors and stocks
  const PALETTE = ['#00d4aa', '#60a5fa', '#f59e0b', '#a78bfa', '#f43f5e', '#34d399', '#fbbf24', '#22d3ee', '#fb923c', '#c084fc', '#f472b6', '#94a3b8', '#10b981', '#6366f1', '#eab308', '#06b6d4', '#84cc16', '#ec4899', '#14b8a6', '#0ea5e9', '#8b5cf6', '#ef4444', '#22c55e', '#3b82f6'];
  function colorFor(i) { return PALETTE[i % PALETTE.length]; }

  // ---------- Formatters ----------
  const fmtCurrency = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  const fmtCurrencyFull = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const fmtCompact = (n) => {
    const v = Math.abs(Number(n || 0));
    if (v >= 10000000) return '₹' + (n / 10000000).toFixed(2) + ' Cr';
    if (v >= 100000) return '₹' + (n / 100000).toFixed(2) + ' L';
    if (v >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K';
    return '₹' + Math.round(Number(n || 0));
  };
  const fmtPct = (n, d = 2) => Number(n || 0).toFixed(d) + '%';
  const fmtQty = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 4 });

  // ---------- Persistence ----------
  function save() {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify({
        portfolio: state.portfolio,
        transactions: state.transactions,
      }));
      if (state.briefing) {
        localStorage.setItem(BRIEFING_KEY, JSON.stringify(state.briefing));
      }
    } catch (e) { console.warn('save failed', e); }
  }
  function load() {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state.portfolio = parsed.portfolio || [];
        state.transactions = parsed.transactions || [];
      }
      const briefRaw = localStorage.getItem(BRIEFING_KEY);
      if (briefRaw) state.briefing = JSON.parse(briefRaw);
    } catch (e) { console.warn('load failed', e); }
  }

  // ---------- Theme ----------
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    if (state.portfolio.length) renderCharts();
  }
  function initTheme() {
    let stored = null;
    try { stored = localStorage.getItem(THEME_KEY); } catch (e) {}
    const theme = stored || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    setTheme(theme);
  }

  // ---------- Toast ----------
  let toastTimer;
  function toast(msg, type = 'info') {
    const t = ui.toast;
    t.textContent = msg;
    t.className = 'toast ' + type;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2800);
  }

  // ---------- Modals ----------
  function openModal(id) {
    document.getElementById(id).hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      const firstInput = document.querySelector('#' + id + ' input, #' + id + ' textarea');
      if (firstInput) firstInput.focus();
    }, 80);
  }
  function closeModals() {
    document.querySelectorAll('.modal').forEach(m => m.hidden = true);
    document.body.style.overflow = '';
  }

  // ---------- Portfolio operations ----------
  function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  function totals() {
    let total = 0;
    state.portfolio.forEach(h => { total += h.qty * h.avgPrice; });
    return total;
  }

  function addTxn(t) {
    state.transactions.unshift({
      id: newId(),
      ts: Date.now(),
      ...t,
    });
  }

  function addPosition({ name, qty, price, thesis }) {
    const cleanName = name.trim().toUpperCase();
    const existing = state.portfolio.find(p => p.name.toUpperCase() === cleanName);
    if (existing) {
      const newQty = existing.qty + qty;
      const newAvg = (existing.qty * existing.avgPrice + qty * price) / newQty;
      existing.qty = newQty;
      existing.avgPrice = newAvg;
      if (thesis) {
        existing.thesis = thesis;
      }
      addTxn({ type: 'BUY', stock: existing.name, qty, price, thesis, newQty, newAvg });
      return existing;
    }
    const h = {
      id: newId(),
      name: cleanName,
      qty,
      avgPrice: price,
      thesis: thesis || '',
      status: 'Intact',
      confidence: 7,
      sector: classifySector(cleanName),
      createdAt: Date.now(),
    };
    state.portfolio.push(h);
    addTxn({ type: 'INIT', stock: h.name, qty, price, thesis, newQty: qty, newAvg: price });
    return h;
  }

  function sellPosition({ id, qty, price, thesis }) {
    const h = state.portfolio.find(p => p.id === id);
    if (!h) return;
    const sellQty = Math.min(qty, h.qty);
    const remaining = h.qty - sellQty;
    if (remaining <= 0.0001) {
      addTxn({ type: 'EXIT', stock: h.name, qty: sellQty, price, thesis, newQty: 0, exitAvg: h.avgPrice });
      state.portfolio = state.portfolio.filter(p => p.id !== id);
    } else {
      h.qty = remaining;
      addTxn({ type: 'SELL', stock: h.name, qty: sellQty, price, thesis, newQty: remaining, avgPrice: h.avgPrice });
    }
  }

  function updateThesis({ id, thesis, status, confidence, note }) {
    const h = state.portfolio.find(p => p.id === id);
    if (!h) return;
    const prev = { thesis: h.thesis, status: h.status, confidence: h.confidence };
    h.thesis = thesis;
    h.status = status;
    h.confidence = Number(confidence);
    addTxn({ type: 'THESIS', stock: h.name, thesis, status, confidence: h.confidence, note, prev });
  }

  // ---------- Excel parsing ----------
  function normalizeKey(k) {
    return String(k || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  const COLUMN_MAP = {
    name: ['nameofstock', 'stockname', 'stock', 'name', 'company', 'security'],
    qty: ['qty', 'quantity', 'shares', 'units'],
    price: ['averageprice', 'avgprice', 'price', 'buyprice', 'costprice', 'avg'],
    total: ['totalvalue', 'value', 'invested', 'investedvalue', 'amount'],
    pct: ['percentageofportfolio', 'percentage', 'portfoliopct', 'weight', 'pctportfolio', 'percent'],
    thesis: ['investmentthesis', 'thesis', 'rationale', 'reason', 'notes'],
  };
  function findColumn(row, type) {
    const keys = Object.keys(row);
    for (const k of keys) {
      const n = normalizeKey(k);
      if (COLUMN_MAP[type].some(target => n.includes(target))) return k;
    }
    return null;
  }
  function parseFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.onload = () => {
        try {
          const data = new Uint8Array(reader.result);
          const wb = XLSX.read(data, { type: 'array' });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
          if (!rows.length) return reject(new Error('Sheet appears empty'));
          const first = rows[0];
          const nameCol = findColumn(first, 'name');
          const qtyCol = findColumn(first, 'qty');
          const priceCol = findColumn(first, 'price');
          const thesisCol = findColumn(first, 'thesis');
          if (!nameCol || !qtyCol || !priceCol) {
            return reject(new Error('Could not match required columns (Name, Qty, Avg Price). Check your file headers.'));
          }
          const out = [];
          rows.forEach((r) => {
            const name = String(r[nameCol] || '').trim();
            const qty = Number(r[qtyCol]);
            const price = Number(r[priceCol]);
            if (!name || !Number.isFinite(qty) || !Number.isFinite(price) || qty <= 0 || price <= 0) return;
            out.push({
              name: name.toUpperCase(),
              qty,
              avgPrice: price,
              thesis: thesisCol ? String(r[thesisCol] || '').trim() : '',
            });
          });
          if (!out.length) return reject(new Error('No valid rows parsed from file'));
          resolve(out);
        } catch (e) {
          reject(e);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  function importHoldings(rows) {
    state.portfolio = rows.map(r => ({
      id: newId(),
      name: r.name,
      qty: r.qty,
      avgPrice: r.avgPrice,
      thesis: r.thesis || '',
      status: 'Intact',
      confidence: 7,
      sector: classifySector(r.name),
      createdAt: Date.now(),
    }));
    state.transactions = state.portfolio.map(h => ({
      id: newId(),
      ts: Date.now(),
      type: 'INIT',
      stock: h.name,
      qty: h.qty,
      price: h.avgPrice,
      thesis: h.thesis,
      newQty: h.qty,
      newAvg: h.avgPrice,
    }));
    state.briefing = null;
    try { localStorage.removeItem(BRIEFING_KEY); } catch (e) {}
    save();
    showApp();
    renderAll();
    toast('Portfolio imported · ' + state.portfolio.length + ' holdings', 'success');
  }

  // ---------- Render: dashboard metrics & charts ----------
  function renderMetrics() {
    const total = totals();
    const count = state.portfolio.length;
    const sorted = [...state.portfolio].sort((a, b) => b.qty * b.avgPrice - a.qty * a.avgPrice);
    const largest = sorted[0];
    const top5 = sorted.slice(0, 5).reduce((s, h) => s + h.qty * h.avgPrice, 0);
    const sectors = new Set(state.portfolio.map(h => h.sector));
    const avg = count ? total / count : 0;

    document.getElementById('m-total').textContent = fmtCompact(total);
    document.getElementById('m-total-sub').textContent = fmtCurrencyFull(total);
    document.getElementById('m-holdings').textContent = count.toString();
    document.getElementById('m-holdings-sub').textContent = sectors.size + ' sectors covered';
    document.getElementById('m-sectors').textContent = sectors.size.toString();
    document.getElementById('m-sectors-sub').textContent = sectors.size >= 8 ? 'Well diversified' : sectors.size >= 5 ? 'Moderately diversified' : 'Concentrated by sector';
    document.getElementById('m-largest').textContent = largest ? largest.name.split(' ')[0].slice(0, 12) : '—';
    document.getElementById('m-largest-sub').textContent = largest ? fmtPct(largest.qty * largest.avgPrice / total * 100) + ' · ' + fmtCompact(largest.qty * largest.avgPrice) : '';
    document.getElementById('m-concentration').textContent = fmtPct(total ? top5 / total * 100 : 0, 1);
    document.getElementById('m-concentration-sub').textContent = total && top5 / total > 0.65 ? 'High top-heavy concentration' : 'Within reasonable bounds';
    document.getElementById('m-avg').textContent = fmtCompact(avg);
    document.getElementById('m-avg-sub').textContent = 'Per holding';

    // Donut center
    const center = document.getElementById('donut-center');
    if (center) center.innerHTML = `<span class="dc-label">Total Invested</span><span class="dc-value">${fmtCompact(total)}</span>`;
    document.getElementById('alloc-sub').textContent = `${count} holdings · ${sectors.size} sectors`;

    renderGauge();
  }

  function renderGauge() {
    // Herfindahl-Hirschman style: lower = more diversified
    const total = totals();
    if (!total) return;
    const hhi = state.portfolio.reduce((s, h) => {
      const w = (h.qty * h.avgPrice) / total;
      return s + w * w;
    }, 0);
    // Map: hhi 0 (perfectly diversified) → 100%, hhi 1 → 0%
    // For ~25 stocks evenly: hhi ≈ 0.04 → great. >0.20 → very concentrated.
    const diversification = Math.max(0, Math.min(1, (1 - hhi) * 1.1));
    const dashOffset = 251 * (1 - diversification);
    const fill = document.getElementById('gauge-fill');
    const needle = document.getElementById('gauge-needle');
    const valEl = document.getElementById('gauge-value');
    const txtEl = document.getElementById('gauge-text');

    // SVG gradient
    let defs = fill.closest('svg').querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      defs.innerHTML = `<linearGradient id="gauge-gradient" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0%" stop-color="#f43f5e"/>
        <stop offset="50%" stop-color="#f59e0b"/>
        <stop offset="100%" stop-color="#00d4aa"/>
      </linearGradient>`;
      fill.closest('svg').prepend(defs);
    }
    fill.style.strokeDashoffset = String(dashOffset);
    const angle = -90 + diversification * 180;
    needle.style.transform = `rotate(${angle}deg)`;

    let label = 'Diffuse';
    if (diversification < 0.4) label = 'Concentrated';
    else if (diversification < 0.7) label = 'Balanced';
    valEl.textContent = Math.round(diversification * 100) + '/100';
    txtEl.textContent = label;
  }

  function destroyChart(name) {
    if (charts[name]) { charts[name].destroy(); delete charts[name]; }
  }

  function chartFontColor() {
    return getComputedStyle(document.documentElement).getPropertyValue('--chart-tick').trim();
  }
  function chartGridColor() {
    return getComputedStyle(document.documentElement).getPropertyValue('--chart-grid').trim();
  }

  function renderCharts() {
    if (!window.Chart) return;
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = chartFontColor();
    Chart.defaults.borderColor = chartGridColor();

    const total = totals();
    if (!total) return;

    const sorted = [...state.portfolio].sort((a, b) => b.qty * b.avgPrice - a.qty * a.avgPrice);

    // Allocation donut
    destroyChart('allocation');
    const allocCtx = document.getElementById('chart-allocation');
    if (allocCtx) {
      charts.allocation = new Chart(allocCtx, {
        type: 'doughnut',
        data: {
          labels: sorted.map(h => h.name),
          datasets: [{
            data: sorted.map(h => h.qty * h.avgPrice),
            backgroundColor: sorted.map((_, i) => colorFor(i)),
            borderColor: getComputedStyle(document.documentElement).getPropertyValue('--surface').trim(),
            borderWidth: 2,
            hoverOffset: 8,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const v = ctx.raw;
                  const pct = (v / total * 100).toFixed(2);
                  return `${ctx.label}: ${fmtCompact(v)} (${pct}%)`;
                }
              }
            }
          }
        }
      });
    }

    // Top holdings horizontal bar
    destroyChart('top');
    const topCtx = document.getElementById('chart-top');
    if (topCtx) {
      const top = sorted.slice(0, 8);
      charts.top = new Chart(topCtx, {
        type: 'bar',
        data: {
          labels: top.map(h => h.name.length > 16 ? h.name.slice(0, 15) + '…' : h.name),
          datasets: [{
            label: 'Invested',
            data: top.map(h => h.qty * h.avgPrice),
            backgroundColor: top.map((_, i) => colorFor(i)),
            borderRadius: 6,
            barThickness: 14,
          }],
        },
        options: {
          indexAxis: 'y',
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `${fmtCompact(ctx.raw)} · ${(ctx.raw / total * 100).toFixed(2)}%`
              }
            }
          },
          scales: {
            x: {
              ticks: { callback: v => fmtCompact(v), font: { size: 11 } },
              grid: { color: chartGridColor(), drawBorder: false },
              border: { display: false },
            },
            y: {
              ticks: { font: { size: 11 } },
              grid: { display: false },
              border: { display: false },
            }
          }
        }
      });
    }

    // Sector exposure stacked horizontal bar
    destroyChart('sectors');
    const secCtx = document.getElementById('chart-sectors');
    if (secCtx) {
      const sectorMap = {};
      state.portfolio.forEach(h => {
        if (!sectorMap[h.sector]) sectorMap[h.sector] = 0;
        sectorMap[h.sector] += h.qty * h.avgPrice;
      });
      const sectorEntries = Object.entries(sectorMap).sort((a, b) => b[1] - a[1]);
      charts.sectors = new Chart(secCtx, {
        type: 'bar',
        data: {
          labels: sectorEntries.map(e => e[0]),
          datasets: [{
            label: 'Exposure',
            data: sectorEntries.map(e => e[1] / total * 100),
            backgroundColor: sectorEntries.map((_, i) => colorFor(i + 3)),
            borderRadius: 8,
            barThickness: 18,
          }],
        },
        options: {
          indexAxis: 'y',
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.raw.toFixed(2)}% · ${fmtCompact(sectorEntries[ctx.dataIndex][1])}`
              }
            }
          },
          scales: {
            x: {
              ticks: { callback: v => v + '%', font: { size: 11 } },
              grid: { color: chartGridColor(), drawBorder: false },
              border: { display: false },
              max: Math.max(20, Math.ceil(Math.max(...sectorEntries.map(e => e[1] / total * 100)) / 5) * 5),
            },
            y: {
              ticks: { font: { size: 11 } },
              grid: { display: false },
              border: { display: false },
            }
          }
        }
      });
    }

    // Weight distribution (vertical bar of all holdings)
    destroyChart('weights');
    const wCtx = document.getElementById('chart-weights');
    if (wCtx) {
      charts.weights = new Chart(wCtx, {
        type: 'bar',
        data: {
          labels: sorted.map(h => h.name.length > 10 ? h.name.slice(0, 9) + '…' : h.name),
          datasets: [{
            label: '%',
            data: sorted.map(h => h.qty * h.avgPrice / total * 100),
            backgroundColor: sorted.map((_, i) => colorFor(i)),
            borderRadius: 4,
            barThickness: 'flex',
            maxBarThickness: 22,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: (items) => sorted[items[0].dataIndex].name,
                label: (ctx) => `${ctx.raw.toFixed(2)}% · ${fmtCompact(sorted[ctx.dataIndex].qty * sorted[ctx.dataIndex].avgPrice)}`
              }
            }
          },
          scales: {
            x: { ticks: { autoSkip: false, font: { size: 10 } }, grid: { display: false }, border: { display: false } },
            y: { ticks: { callback: v => v + '%', font: { size: 11 } }, grid: { color: chartGridColor(), drawBorder: false }, border: { display: false } }
          }
        }
      });
    }

    // Conviction radar (top 8)
    destroyChart('conviction');
    const cvCtx = document.getElementById('chart-conviction');
    if (cvCtx) {
      const cvHoldings = sorted.slice(0, 8);
      charts.conviction = new Chart(cvCtx, {
        type: 'radar',
        data: {
          labels: cvHoldings.map(h => h.name.length > 12 ? h.name.slice(0, 11) + '…' : h.name),
          datasets: [{
            label: 'Confidence',
            data: cvHoldings.map(h => h.confidence || 7),
            backgroundColor: 'rgba(0, 212, 170, 0.15)',
            borderColor: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
            borderWidth: 2,
            pointBackgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
            pointRadius: 4,
            pointHoverRadius: 6,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: {
            r: {
              min: 0, max: 10,
              ticks: { display: false, stepSize: 2 },
              grid: { color: chartGridColor() },
              angleLines: { color: chartGridColor() },
              pointLabels: { font: { size: 9 }, color: chartFontColor() },
            }
          },
          plugins: { legend: { display: false } }
        }
      });
    }
  }

  // ---------- Render: holdings table ----------
  function renderHoldings() {
    const total = totals();
    const tbody = document.getElementById('holdings-tbody');
    const search = (document.getElementById('holdings-search').value || '').toLowerCase().trim();
    const sorted = [...state.portfolio].sort((a, b) => b.qty * b.avgPrice - a.qty * a.avgPrice);
    const filtered = search ? sorted.filter(h => h.name.toLowerCase().includes(search) || (h.sector || '').toLowerCase().includes(search)) : sorted;
    tbody.innerHTML = '';
    document.getElementById('holdings-empty').hidden = filtered.length > 0;
    filtered.forEach(h => {
      const invested = h.qty * h.avgPrice;
      const weight = total ? invested / total * 100 : 0;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="stock-cell">${escapeHtml(h.name)}</div>
          <div class="stock-cell-sub">Added ${formatRelative(h.createdAt || Date.now())}</div>
        </td>
        <td><span class="sector-chip">${escapeHtml(h.sector || classifySector(h.name))}</span></td>
        <td class="num">${fmtQty(h.qty)}</td>
        <td class="num">${fmtCurrencyFull(h.avgPrice)}</td>
        <td class="num">${fmtCompact(invested)}</td>
        <td>
          <div class="weight-bar-wrap">
            <div class="weight-bar"><div class="weight-bar-fill" style="width:${Math.min(100, weight * 3)}%"></div></div>
            <span class="weight-bar-label">${weight.toFixed(2)}%</span>
          </div>
        </td>
        <td>
          <div class="thesis-cell" data-id="${h.id}">${escapeHtml(h.thesis || 'No thesis recorded — tap to add.')}</div>
          <span class="conviction-badge ${(h.status || 'intact').toLowerCase()}">${h.status || 'Intact'} · ${h.confidence || 7}/10</span>
        </td>
        <td class="actions-col">
          <div class="row-actions">
            <button class="row-btn" data-act="buy" data-id="${h.id}" data-tip="Add to position">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            <button class="row-btn" data-act="sell" data-id="${h.id}" data-tip="Reduce/Exit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            <button class="row-btn" data-act="thesis" data-id="${h.id}" data-tip="Update thesis">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
  }

  function formatRelative(ts) {
    const diff = Date.now() - ts;
    const day = 86400000;
    if (diff < day) return 'today';
    if (diff < 2 * day) return 'yesterday';
    if (diff < 30 * day) return Math.floor(diff / day) + ' days ago';
    if (diff < 365 * day) return Math.floor(diff / (30 * day)) + ' months ago';
    return Math.floor(diff / (365 * day)) + ' years ago';
  }

  // ---------- Render: transactions ----------
  function renderTransactions() {
    const filter = document.querySelector('.filter-chip.active')?.dataset.filter || 'all';
    const list = filter === 'all' ? state.transactions :
      filter === 'BUY' ? state.transactions.filter(t => t.type === 'BUY' || t.type === 'INIT') :
      filter === 'SELL' ? state.transactions.filter(t => t.type === 'SELL' || t.type === 'EXIT') :
      state.transactions.filter(t => t.type === 'THESIS');

    // Activity stats
    const buys = state.transactions.filter(t => t.type === 'BUY' || t.type === 'INIT').length;
    const sells = state.transactions.filter(t => t.type === 'SELL' || t.type === 'EXIT').length;
    const thesisChanges = state.transactions.filter(t => t.type === 'THESIS').length;
    const buyValue = state.transactions.filter(t => t.type === 'BUY' || t.type === 'INIT').reduce((s, t) => s + (t.qty || 0) * (t.price || 0), 0);
    const sellValue = state.transactions.filter(t => t.type === 'SELL' || t.type === 'EXIT').reduce((s, t) => s + (t.qty || 0) * (t.price || 0), 0);

    document.getElementById('activity-stats').innerHTML = `
      <div class="activity-stat-card">
        <div class="activity-stat-label">Total Transactions</div>
        <div class="activity-stat-value">${state.transactions.length}</div>
      </div>
      <div class="activity-stat-card">
        <div class="activity-stat-label">Buys</div>
        <div class="activity-stat-value" style="color: var(--positive)">${buys}</div>
        <div class="activity-stat-sub">${fmtCompact(buyValue)} deployed</div>
      </div>
      <div class="activity-stat-card">
        <div class="activity-stat-label">Sells</div>
        <div class="activity-stat-value" style="color: var(--danger)">${sells}</div>
        <div class="activity-stat-sub">${fmtCompact(sellValue)} realized</div>
      </div>
      <div class="activity-stat-card">
        <div class="activity-stat-label">Thesis Updates</div>
        <div class="activity-stat-value" style="color: var(--accent)">${thesisChanges}</div>
      </div>
    `;

    const tl = document.getElementById('txn-timeline');
    if (!list.length) {
      tl.innerHTML = '<div class="timeline-empty">No activity yet for this filter.</div>';
      return;
    }
    tl.innerHTML = list.map(t => {
      const date = new Date(t.ts);
      const dateStr = date.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      let detail = '';
      let body = '';
      if (t.type === 'BUY' || t.type === 'INIT') {
        detail = `+${fmtQty(t.qty)} sh @ ${fmtCurrencyFull(t.price)} · Total ${fmtCompact(t.qty * t.price)}`;
        if (t.newAvg) detail += ` · New avg ${fmtCurrencyFull(t.newAvg)}`;
        body = t.thesis ? `<div class="timeline-thesis">${escapeHtml(t.thesis)}</div>` : '';
      } else if (t.type === 'SELL' || t.type === 'EXIT') {
        detail = `−${fmtQty(t.qty)} sh @ ${fmtCurrencyFull(t.price)} · Proceeds ${fmtCompact(t.qty * t.price)}`;
        if (t.type === 'EXIT') detail += ' · Full exit';
        body = t.thesis ? `<div class="timeline-thesis">${escapeHtml(t.thesis)}</div>` : '';
      } else if (t.type === 'THESIS') {
        detail = `Conviction ${t.status || 'Intact'} · ${t.confidence}/10`;
        body = `<div class="timeline-thesis">${escapeHtml(t.thesis || '')}</div>`;
        if (t.note) body += `<div class="timeline-thesis" style="border-left-color: var(--warn); margin-top: 6px;">${escapeHtml(t.note)}</div>`;
      }
      const typeLabel = t.type === 'INIT' ? 'IMPORT' : t.type;
      return `
        <div class="timeline-item" data-type="${t.type}">
          <div class="timeline-dot"></div>
          <div class="timeline-head">
            <span class="timeline-type">${typeLabel}</span>
            <span class="timeline-stock">${escapeHtml(t.stock)}</span>
            <span class="timeline-time">${dateStr}</span>
          </div>
          <div class="timeline-detail">${detail}</div>
          ${body}
        </div>`;
    }).join('');
  }

  // ---------- Render: briefing ----------
  function renderBriefing() {
    const empty = document.getElementById('briefing-empty');
    const content = document.getElementById('briefing-content');
    const meta = document.getElementById('briefing-meta');
    const dot = document.getElementById('briefing-dot');

    if (!state.briefing || !state.briefing.data) {
      empty.hidden = false;
      content.hidden = true;
      meta.textContent = 'Live market intelligence filtered against your holdings.';
      dot.hidden = true;
      return;
    }

    empty.hidden = true;
    content.hidden = false;
    const generatedAt = new Date(state.briefing.ts || Date.now());
    meta.innerHTML = `Generated ${generatedAt.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · Model: <code style="font-family:'JetBrains Mono',monospace;font-size:0.78em;color:var(--accent)">${escapeHtml(state.briefing.model || 'claude')}</code>`;
    dot.hidden = !isToday(state.briefing.ts);

    const data = state.briefing.data;

    // Hero stats
    const execSummary = data.executive_summary || [];
    const portfolioImpact = data.portfolio_impact || [];
    const actionsRequired = execSummary.filter(i => i.action_required).length;
    document.getElementById('hero-items').textContent = execSummary.length;
    document.getElementById('hero-affected').textContent = portfolioImpact.length;
    document.getElementById('hero-actions').textContent = actionsRequired;
    document.getElementById('hero-sources').textContent = (state.briefing.sources || []).length;

    // Impact distribution
    const counts = { '++': 0, '+': 0, '0': 0, '-': 0, '--': 0 };
    [...execSummary, ...portfolioImpact].forEach(i => { if (counts[i.impact] !== undefined) counts[i.impact]++; });
    const totalImpact = Object.values(counts).reduce((s, v) => s + v, 0) || 1;
    document.getElementById('impact-bar').innerHTML = Object.entries(counts)
      .filter(([_, v]) => v > 0)
      .map(([k, v]) => `<div class="impact-bar-seg" data-rating="${k}" style="width:${v / totalImpact * 100}%"></div>`)
      .join('');
    document.getElementById('impact-legend').innerHTML = Object.entries(counts)
      .filter(([_, v]) => v > 0)
      .map(([k, v]) => `<div class="impact-legend-item"><span class="impact-legend-dot" data-rating="${k}"></span>${impactLabel(k)} · ${v}</div>`)
      .join('');

    // 1. Executive Summary
    renderBriefList('exec-body', execSummary, (item) => `
      <div class="brief-item">
        <div class="brief-item-head">
          <div class="brief-item-title">${escapeHtml(item.event || '')}</div>
          <div class="brief-item-meta">
            ${item.related_holding ? `<span class="tag-pill">${escapeHtml(item.related_holding)}</span>` : ''}
            <span class="impact-pill" data-rating="${item.impact || '0'}">${item.impact || '0'}</span>
            <span class="action-pill ${item.action_required ? 'required' : 'none'}">${item.action_required ? 'Action' : 'Monitor'}</span>
          </div>
        </div>
        <div class="brief-item-body">${escapeHtml(item.why_it_matters || '')}</div>
      </div>
    `);

    // 2. Portfolio Impact
    renderBriefList('portfolio-impact-body', portfolioImpact, (item) => `
      <div class="brief-item">
        <div class="brief-item-head">
          <div class="brief-item-title">${escapeHtml(item.holding || '')}</div>
          <div class="brief-item-meta">
            <span class="impact-pill" data-rating="${item.impact || '0'}">${item.impact || '0'}</span>
            <span class="tag-pill">${escapeHtml(item.conviction_change || '')}</span>
          </div>
        </div>
        <div class="brief-grid-2">
          <div class="label-pair">
            <span class="lp-label">New Information</span>
            <span class="lp-value">${escapeHtml(item.new_information || '')}</span>
          </div>
          <div class="label-pair">
            <span class="lp-label">Suggested Action</span>
            <span class="lp-value">${escapeHtml(item.suggested_action || '')}</span>
          </div>
        </div>
      </div>
    `);

    // 3. Mispricing
    renderBriefList('mispricing-body', data.mispricing_opportunities || [], (item) => `
      <div class="brief-item">
        <div class="brief-grid-2">
          <div class="label-pair">
            <span class="lp-label">Consensus</span>
            <span class="lp-value">${escapeHtml(item.consensus_view || '')}</span>
          </div>
          <div class="label-pair">
            <span class="lp-label">Alternative</span>
            <span class="lp-value">${escapeHtml(item.alternative_view || '')}</span>
          </div>
        </div>
        <div class="label-pair" style="margin-top: 10px;">
          <span class="lp-label">Investment Implication</span>
          <span class="lp-value">${escapeHtml(item.investment_implication || '')}</span>
        </div>
      </div>
    `);

    // 4. Disconfirming
    renderBriefList('disconfirm-body', data.disconfirming_evidence || [], (item) => `
      <div class="brief-item">
        <div class="brief-item-head">
          <div class="brief-item-title">${escapeHtml(item.thesis || '')}</div>
          <div class="brief-item-meta">
            <span class="tag-pill">${escapeHtml(item.importance || 'Medium')}</span>
          </div>
        </div>
        <div class="brief-item-body">${escapeHtml(item.contradictory_evidence || '')}</div>
      </div>
    `);

    // 5. Smart Money
    renderBriefList('smart-body', data.smart_money || [], (item) => `
      <div class="brief-item">
        <div class="brief-item-head">
          <div class="brief-item-title">${escapeHtml(item.event || '')}</div>
          <div class="brief-item-meta">
            <span class="tag-pill">${escapeHtml(item.importance || 'Medium')}</span>
          </div>
        </div>
        <div class="brief-item-body">${escapeHtml(item.interpretation || '')}</div>
      </div>
    `);

    // 6. Earnings
    renderBriefList('earnings-body', data.earnings_filings || [], (item) => `
      <div class="brief-item">
        <div class="brief-item-head">
          <div class="brief-item-title">${escapeHtml(item.company || '')}</div>
        </div>
        <div class="brief-grid-2">
          <div class="label-pair">
            <span class="lp-label">What Changed vs Previous</span>
            <span class="lp-value">${escapeHtml(item.change_vs_previous || '')}</span>
          </div>
          <div class="label-pair">
            <span class="lp-label">Material Development</span>
            <span class="lp-value">${escapeHtml(item.material_development || '')}</span>
          </div>
        </div>
      </div>
    `);

    // 7. Risk Dashboard
    const risk = data.risk_dashboard || {};
    const riskBody = document.getElementById('risk-body');
    const renderRiskGroup = (title, items, color) => {
      if (!items || !items.length) return '';
      return `<div class="brief-item" style="border-left:3px solid ${color}">
        <div class="brief-item-head"><div class="brief-item-title">${title}</div></div>
        <div class="brief-item-body">${items.map(i => `<div style="padding:4px 0; border-top:1px solid var(--border);">${escapeHtml(i)}</div>`).join('')}</div>
      </div>`;
    };
    const macroHtml = renderRiskGroup('Macro', risk.macro, 'var(--info)');
    const marketHtml = renderRiskGroup('Market', risk.market, 'var(--warn)');
    const portfolioRiskHtml = renderRiskGroup('Portfolio', risk.portfolio, 'var(--danger)');
    const allRisk = (macroHtml + marketHtml + portfolioRiskHtml);
    riskBody.innerHTML = allRisk || '<div class="empty-section-note">No unusual risk developments to flag today.</div>';

    // 8. Contrarian
    const ci = data.contrarian_insight;
    document.getElementById('contrarian-body').innerHTML = ci ? `
      <div class="brief-item">
        <div class="brief-grid-2">
          <div class="label-pair">
            <span class="lp-label">Consensus</span>
            <span class="lp-value">${escapeHtml(ci.consensus || '')}</span>
          </div>
          <div class="label-pair">
            <span class="lp-label">Alternative Interpretation</span>
            <span class="lp-value">${escapeHtml(ci.alternative_interpretation || '')}</span>
          </div>
          <div class="label-pair">
            <span class="lp-label">Evidence</span>
            <span class="lp-value">${escapeHtml(ci.evidence || '')}</span>
          </div>
          <div class="label-pair">
            <span class="lp-label">Investment Implication</span>
            <span class="lp-value">${escapeHtml(ci.investment_implication || '')}</span>
          </div>
        </div>
      </div>
    ` : '<div class="empty-section-note">No contrarian flag worth raising today.</div>';

    // 9. Decision Log
    renderDecisionLog(data.decision_log || {});

    // Sources
    renderSources(state.briefing.sources || []);
  }

  function renderBriefList(elId, items, tpl) {
    const el = document.getElementById(elId);
    if (!items || !items.length) {
      el.innerHTML = '<div class="empty-section-note">Nothing material to surface for this section today.</div>';
      return;
    }
    el.innerHTML = items.map(tpl).join('');
  }

  function impactLabel(rating) {
    return { '++': 'Strong Positive', '+': 'Positive', '0': 'Neutral', '-': 'Negative', '--': 'Strong Negative' }[rating] || rating;
  }

  function renderDecisionLog(log) {
    const buckets = [
      { key: 'buy', label: 'Buy', cls: 'buy' },
      { key: 'add', label: 'Add', cls: 'add' },
      { key: 'hold', label: 'Hold', cls: 'hold' },
      { key: 'reduce', label: 'Reduce', cls: 'reduce' },
      { key: 'exit', label: 'Exit', cls: 'exit' },
      { key: 'research', label: 'Research', cls: 'research' },
    ];
    const counts = buckets.map(b => (log[b.key] || []).length);
    const totalDecisions = counts.reduce((s, v) => s + v, 0);

    // Render decision chart
    destroyChart('decisions');
    const decCtx = document.getElementById('chart-decisions');
    if (decCtx && totalDecisions > 0) {
      charts.decisions = new Chart(decCtx, {
        type: 'bar',
        data: {
          labels: buckets.map(b => b.label),
          datasets: [{
            data: counts,
            backgroundColor: ['#10b981', '#34d399', '#94a3b8', '#f59e0b', '#f43f5e', '#60a5fa'],
            borderRadius: 6,
            barThickness: 24,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.raw} decision${c.raw !== 1 ? 's' : ''}` } } },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } }, grid: { color: chartGridColor(), drawBorder: false }, border: { display: false } },
            x: { ticks: { font: { size: 11 } }, grid: { display: false }, border: { display: false } }
          }
        }
      });
    }

    const body = document.getElementById('decision-body');
    if (totalDecisions === 0) {
      body.innerHTML = '<div class="empty-section-note">No decisions queued for action today — discipline matters.</div>';
      return;
    }
    body.innerHTML = `<div class="decision-grid">${buckets.map(b => {
      const items = log[b.key] || [];
      if (!items.length) return '';
      return `
        <div class="decision-bucket">
          <div class="decision-bucket-head">
            <span class="decision-bucket-tag ${b.cls}">${b.label}</span>
            <span class="decision-bucket-count">${items.length} ${items.length === 1 ? 'item' : 'items'}</span>
          </div>
          ${items.map(d => `
            <div class="decision-row">
              <span class="dr-stock">${escapeHtml(d.stock || '')}</span>
              <span class="dr-rationale">${escapeHtml(d.rationale || '')}</span>
            </div>
          `).join('')}
        </div>
      `;
    }).join('')}</div>`;
  }

  function renderSources(sources) {
    const el = document.getElementById('sources-body');
    if (!sources || !sources.length) {
      el.innerHTML = '<div class="empty-section-note">No citations recorded for this briefing.</div>';
      return;
    }
    el.innerHTML = `<div class="source-grid">${sources.map((s, i) => `
      <a class="source-item" href="${escapeHtml(s.url || '#')}" target="_blank" rel="noopener noreferrer">
        <span class="source-num">${String(i + 1).padStart(2, '0')}</span>
        <div class="source-body">
          <div class="source-title">${escapeHtml(s.title || s.url || 'Source')}</div>
          <div class="source-url">${escapeHtml(s.url || '')}</div>
        </div>
      </a>
    `).join('')}</div>`;
  }

  function isToday(ts) {
    if (!ts) return false;
    const d = new Date(ts);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  }

  // ---------- Briefing generation ----------
  let briefingInFlight = false;
  async function generateBriefing(force = false) {
    if (briefingInFlight) return;
    if (!state.portfolio.length) { toast('Add holdings before generating a briefing.', 'error'); return; }
    if (!force && state.briefing && isToday(state.briefing.ts)) {
      switchView('briefing');
      return;
    }
    briefingInFlight = true;

    const loadingEl = document.getElementById('briefing-loading');
    const emptyEl = document.getElementById('briefing-empty');
    const contentEl = document.getElementById('briefing-content');
    const errorEl = document.getElementById('briefing-error');
    loadingEl.hidden = false;
    emptyEl.hidden = true;
    contentEl.hidden = true;
    errorEl.hidden = true;

    // Animate the loader. First stage covers possible backend cold-start
    // (Render free tier can sleep — first request after idle takes 30–60s).
    const stages = [
      'Waking analyst service…',
      'Pulling live filings and announcements…',
      'Scanning macro & sector developments…',
      'Cross-referencing with your positions…',
      'Applying the Final Filter…',
      'Structuring briefing…',
    ];
    const stagesEl = document.getElementById('loader-stages');
    stagesEl.innerHTML = stages.map((s, i) => `<div class="loader-stage" data-i="${i}"><span class="stage-icon">○</span><span>${s}</span></div>`).join('');
    let stageIdx = 0;
    document.getElementById('loader-bar').style.width = '8%';
    document.querySelector('.loader-stage[data-i="0"]')?.classList.add('active');
    const stageTimer = setInterval(() => {
      const cur = document.querySelector(`.loader-stage[data-i="${stageIdx}"]`);
      if (cur) { cur.classList.remove('active'); cur.classList.add('done'); cur.querySelector('.stage-icon').textContent = '●'; }
      stageIdx++;
      if (stageIdx < stages.length) {
        const next = document.querySelector(`.loader-stage[data-i="${stageIdx}"]`);
        if (next) next.classList.add('active');
      }
      const pct = Math.min(90, 8 + (stageIdx + 1) / stages.length * 80);
      document.getElementById('loader-bar').style.width = pct + '%';
    }, 4500);

    try {
      const payload = {
        portfolio: state.portfolio.map(h => ({
          name: h.name,
          qty: h.qty,
          avgPrice: h.avgPrice,
          invested: h.qty * h.avgPrice,
          thesis: h.thesis,
          status: h.status,
          confidence: h.confidence,
          sector: h.sector,
        })),
        totalInvested: totals(),
        date: new Date().toISOString().slice(0, 10),
      };

      const endpoint = window.PIIS_BRIEFING_ENDPOINT || '/api/briefing';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let detail = '';
        try {
          const errBody = await res.json();
          detail = errBody.error || errBody.message || ('HTTP ' + res.status);
        } catch (e) {
          detail = 'HTTP ' + res.status;
        }
        throw new Error(detail);
      }

      const result = await res.json();
      if (!result || !result.briefing) throw new Error('Invalid briefing response');

      state.briefing = {
        ts: Date.now(),
        data: result.briefing,
        sources: result.sources || [],
        model: result.model || 'claude',
      };
      save();
      document.getElementById('loader-bar').style.width = '100%';
      // Brief delay for visual completion
      await new Promise(r => setTimeout(r, 400));
      loadingEl.hidden = true;
      renderBriefing();
      toast('Briefing generated', 'success');
    } catch (err) {
      console.error(err);
      loadingEl.hidden = true;
      errorEl.hidden = false;
      document.getElementById('error-detail').textContent = err.message || 'Unknown error';
    } finally {
      clearInterval(stageTimer);
      briefingInFlight = false;
    }
  }

  // ---------- Views ----------
  function showApp() {
    document.getElementById('empty-state').hidden = true;
    document.getElementById('nav-tabs').hidden = false;
    document.getElementById('export-btn').hidden = false;
    document.getElementById('reset-btn').hidden = false;
    switchView('briefing');
  }
  function switchView(view) {
    document.querySelectorAll('.view').forEach(v => v.hidden = true);
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('view-' + view).hidden = false;
    document.querySelector(`.nav-tab[data-view="${view}"]`)?.classList.add('active');
    if (view === 'dashboard') {
      // Render charts after layout
      requestAnimationFrame(() => renderCharts());
    }
  }

  function renderAll() {
    if (!state.portfolio.length) {
      document.getElementById('empty-state').hidden = false;
      document.getElementById('nav-tabs').hidden = true;
      document.getElementById('export-btn').hidden = true;
      document.getElementById('reset-btn').hidden = true;
      return;
    }
    renderMetrics();
    renderHoldings();
    renderTransactions();
    renderBriefing();
    if (!document.getElementById('view-dashboard').hidden) renderCharts();
  }

  // ---------- Export ----------
  function exportPortfolio() {
    const total = totals();
    const rows = state.portfolio.map((h, i) => ({
      'Sl. No.': i + 1,
      'Name of Stock': h.name,
      'Qty': h.qty,
      'Average Price': Number(h.avgPrice.toFixed(2)),
      'Total Value': Number((h.qty * h.avgPrice).toFixed(2)),
      'Percentage of Portfolio': Number((total ? (h.qty * h.avgPrice) / total * 100 : 0).toFixed(2)),
      'Investment Thesis': h.thesis,
      'Sector': h.sector || classifySector(h.name),
      'Conviction Status': h.status,
      'Confidence (1-10)': h.confidence,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Portfolio');

    // Transactions sheet
    const txnRows = state.transactions.map(t => ({
      Timestamp: new Date(t.ts).toISOString(),
      Type: t.type,
      Stock: t.stock,
      Quantity: t.qty || '',
      Price: t.price || '',
      Value: t.qty && t.price ? Number((t.qty * t.price).toFixed(2)) : '',
      'Thesis/Rationale': t.thesis || '',
      'Conviction': t.status || '',
      'Confidence': t.confidence || '',
    }));
    if (txnRows.length) {
      const ws2 = XLSX.utils.json_to_sheet(txnRows);
      XLSX.utils.book_append_sheet(wb, ws2, 'Transactions');
    }

    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `PIIS_Portfolio_${date}.xlsx`);
    toast('Exported to Excel', 'success');
  }

  // ---------- Wiring ----------
  function wire() {
    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      setTheme(next);
    });

    // Upload
    const fileInput = document.getElementById('file-input');
    const uploadZone = document.getElementById('upload-zone');
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', async (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) await handleFile(file);
    });
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) await handleFile(file);
      fileInput.value = '';
    });

    document.getElementById('load-sample').addEventListener('click', () => {
      importHoldings(SAMPLE.map(s => ({ ...s })));
    });

    document.getElementById('start-blank').addEventListener('click', () => {
      state.portfolio = [];
      state.transactions = [];
      state.briefing = null;
      save();
      showApp();
      renderAll();
      openModal('modal-add');
    });

    // Nav
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => switchView(tab.dataset.view));
    });

    // Export
    document.getElementById('export-btn').addEventListener('click', exportPortfolio);

    // Reset
    document.getElementById('reset-btn').addEventListener('click', () => {
      ui.confirmOk.onclick = () => {
        state.portfolio = [];
        state.transactions = [];
        state.briefing = null;
        try { localStorage.removeItem(STATE_KEY); localStorage.removeItem(BRIEFING_KEY); } catch (e) {}
        closeModals();
        renderAll();
        toast('Portfolio cleared', 'info');
      };
      document.getElementById('confirm-title').textContent = 'Reset Portfolio';
      document.getElementById('confirm-body').textContent = 'This will erase your portfolio, transaction history, and briefing. This cannot be undone.';
      openModal('modal-confirm');
    });

    // Modal close
    document.querySelectorAll('[data-close]').forEach(el => {
      el.addEventListener('click', closeModals);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModals();
    });

    // Add stock
    document.getElementById('add-stock-btn').addEventListener('click', () => {
      document.getElementById('form-add').reset();
      openModal('modal-add');
    });
    document.getElementById('form-add').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target;
      addPosition({
        name: f.name.value,
        qty: Number(f.qty.value),
        price: Number(f.price.value),
        thesis: f.thesis.value.trim(),
      });
      save();
      renderAll();
      closeModals();
      toast('Position added', 'success');
    });

    // Row actions (delegation)
    document.getElementById('holdings-tbody').addEventListener('click', (e) => {
      const btn = e.target.closest('.row-btn');
      if (btn) {
        const id = btn.dataset.id;
        const act = btn.dataset.act;
        const h = state.portfolio.find(p => p.id === id);
        if (!h) return;
        if (act === 'buy') openBuy(h);
        else if (act === 'sell') openSell(h);
        else if (act === 'thesis') openThesis(h);
        return;
      }
      const thesis = e.target.closest('.thesis-cell');
      if (thesis) {
        const h = state.portfolio.find(p => p.id === thesis.dataset.id);
        if (h) openThesis(h);
      }
    });

    // Buy form
    document.getElementById('form-buy').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target;
      const id = f.dataset.targetId;
      const h = state.portfolio.find(p => p.id === id);
      if (!h) return;
      const qty = Number(f.qty.value);
      const price = Number(f.price.value);
      const thesis = f.thesis.value.trim();
      addPosition({ name: h.name, qty, price, thesis });
      save();
      renderAll();
      closeModals();
      toast('Added to ' + h.name, 'success');
    });

    // Buy live preview
    ['qty', 'price'].forEach(n => {
      document.querySelector(`#form-buy input[name="${n}"]`).addEventListener('input', updateBuyPreview);
    });

    // Sell form
    document.getElementById('form-sell').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target;
      const id = f.dataset.targetId;
      const h = state.portfolio.find(p => p.id === id);
      if (!h) return;
      const qty = Number(f.qty.value);
      if (qty > h.qty + 0.0001) { toast('Cannot sell more than you hold.', 'error'); return; }
      sellPosition({ id, qty, price: Number(f.price.value), thesis: f.thesis.value.trim() });
      save();
      renderAll();
      closeModals();
      toast('Position updated', 'success');
    });

    ['qty', 'price'].forEach(n => {
      document.querySelector(`#form-sell input[name="${n}"]`).addEventListener('input', updateSellPreview);
    });

    document.querySelectorAll('.quick-sell button').forEach(btn => {
      btn.addEventListener('click', () => {
        const pct = Number(btn.dataset.pct);
        const id = document.getElementById('form-sell').dataset.targetId;
        const h = state.portfolio.find(p => p.id === id);
        if (!h) return;
        const qty = h.qty * pct / 100;
        const input = document.querySelector('#form-sell input[name="qty"]');
        input.value = qty.toFixed(4);
        updateSellPreview();
      });
    });

    // Thesis form
    document.getElementById('form-thesis').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target;
      const id = f.dataset.targetId;
      updateThesis({
        id,
        thesis: f.thesis.value.trim(),
        status: f.status.value,
        confidence: Number(f.confidence.value),
        note: f.note.value.trim(),
      });
      save();
      renderAll();
      closeModals();
      toast('Thesis updated', 'success');
    });

    const confInput = document.querySelector('#form-thesis input[name="confidence"]');
    confInput.addEventListener('input', () => {
      document.getElementById('conf-val').textContent = confInput.value;
    });

    // Holdings search
    document.getElementById('holdings-search').addEventListener('input', () => renderHoldings());

    // Transaction filters
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        renderTransactions();
      });
    });

    // Briefing buttons
    document.getElementById('generate-briefing').addEventListener('click', () => generateBriefing(true));
    document.getElementById('error-retry').addEventListener('click', () => generateBriefing(true));

    // Listen for system theme changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        let stored = null;
        try { stored = localStorage.getItem(THEME_KEY); } catch (e) {}
        if (!stored) initTheme();
      });
    }
  }

  async function handleFile(file) {
    try {
      const rows = await parseFile(file);
      importHoldings(rows);
    } catch (err) {
      toast(err.message || 'Failed to import file', 'error');
    }
  }

  // Modal helpers
  function openBuy(h) {
    const form = document.getElementById('form-buy');
    form.reset();
    form.dataset.targetId = h.id;
    document.getElementById('buy-context').innerHTML = `
      <strong>${escapeHtml(h.name)}</strong>
      <div class="ctx-meta">Current: ${fmtQty(h.qty)} sh @ ${fmtCurrencyFull(h.avgPrice)} · Invested ${fmtCompact(h.qty * h.avgPrice)}</div>
    `;
    document.getElementById('buy-preview').classList.remove('active');
    openModal('modal-buy');
  }

  function updateBuyPreview() {
    const form = document.getElementById('form-buy');
    const id = form.dataset.targetId;
    const h = state.portfolio.find(p => p.id === id);
    if (!h) return;
    const qty = Number(form.qty.value);
    const price = Number(form.price.value);
    const preview = document.getElementById('buy-preview');
    if (!qty || !price) { preview.classList.remove('active'); return; }
    const newQty = h.qty + qty;
    const newAvg = (h.qty * h.avgPrice + qty * price) / newQty;
    const newInvested = newQty * newAvg;
    preview.innerHTML = `
      <div class="preview-row"><span>Buy value</span><strong>${fmtCurrencyFull(qty * price)}</strong></div>
      <div class="preview-row"><span>New quantity</span><strong>${fmtQty(newQty)}</strong></div>
      <div class="preview-row highlight"><span>New avg price</span><strong>${fmtCurrencyFull(newAvg)}</strong></div>
      <div class="preview-row"><span>Total invested after</span><strong>${fmtCompact(newInvested)}</strong></div>
    `;
    preview.classList.add('active');
  }

  function openSell(h) {
    const form = document.getElementById('form-sell');
    form.reset();
    form.dataset.targetId = h.id;
    document.getElementById('sell-context').innerHTML = `
      <strong>${escapeHtml(h.name)}</strong>
      <div class="ctx-meta">Holds: ${fmtQty(h.qty)} sh @ avg ${fmtCurrencyFull(h.avgPrice)} · Invested ${fmtCompact(h.qty * h.avgPrice)}</div>
    `;
    document.getElementById('sell-preview').classList.remove('active');
    openModal('modal-sell');
  }

  function updateSellPreview() {
    const form = document.getElementById('form-sell');
    const id = form.dataset.targetId;
    const h = state.portfolio.find(p => p.id === id);
    if (!h) return;
    const qty = Number(form.qty.value);
    const price = Number(form.price.value);
    const preview = document.getElementById('sell-preview');
    if (!qty || !price) { preview.classList.remove('active'); return; }
    const realized = qty * price;
    const cost = qty * h.avgPrice;
    const pnl = realized - cost;
    const pnlPct = cost ? (pnl / cost) * 100 : 0;
    const remaining = Math.max(0, h.qty - qty);
    preview.innerHTML = `
      <div class="preview-row"><span>Sale proceeds</span><strong>${fmtCurrencyFull(realized)}</strong></div>
      <div class="preview-row"><span>Cost basis</span><strong>${fmtCurrencyFull(cost)}</strong></div>
      <div class="preview-row highlight"><span>${pnl >= 0 ? 'Realized gain' : 'Realized loss'}</span><strong style="color:${pnl >= 0 ? 'var(--positive)' : 'var(--danger)'}">${fmtCurrencyFull(pnl)} (${pnlPct.toFixed(2)}%)</strong></div>
      <div class="preview-row"><span>Remaining qty</span><strong>${remaining === 0 ? 'Full exit' : fmtQty(remaining)}</strong></div>
    `;
    preview.classList.add('active');
  }

  function openThesis(h) {
    const form = document.getElementById('form-thesis');
    form.reset();
    form.dataset.targetId = h.id;
    form.thesis.value = h.thesis || '';
    form.status.value = h.status || 'Intact';
    form.confidence.value = h.confidence || 7;
    document.getElementById('conf-val').textContent = h.confidence || 7;
    document.getElementById('thesis-context').innerHTML = `
      <strong>${escapeHtml(h.name)}</strong>
      <div class="ctx-meta">${fmtQty(h.qty)} sh @ ${fmtCurrencyFull(h.avgPrice)} · Invested ${fmtCompact(h.qty * h.avgPrice)}</div>
    `;
    openModal('modal-thesis');
  }

  // ---------- Init ----------
  function init() {
    ui.toast = document.getElementById('toast');
    ui.confirmOk = document.getElementById('confirm-ok');

    initTheme();
    load();
    wire();

    if (state.portfolio.length) {
      showApp();
      renderAll();
      // Auto-trigger briefing for the day if not generated yet
      if (!state.briefing || !isToday(state.briefing.ts)) {
        // Defer slightly so UI renders first
        setTimeout(() => {
          if (window.PIIS_AUTO_BRIEFING !== false) generateBriefing(true);
        }, 1500);
      }
    } else {
      document.getElementById('empty-state').hidden = false;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
