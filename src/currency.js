// ===== RoomFound Dual Currency Manager (USD $ ⇄ BDT ৳) =====
(function (global) {
  'use strict';

  var STORAGE_KEY = 'rf_currency';
  var DEFAULT_CURRENCY = 'USD';
  var EXCHANGE_RATE_BDT = 120; // 1 USD = 120 BDT

  var CURRENCIES = {
    USD: {
      code: 'USD',
      symbol: '$',
      rate: 1,
      label: 'USD ($)',
      symbolPrefix: true
    },
    BDT: {
      code: 'BDT',
      symbol: '৳',
      rate: EXCHANGE_RATE_BDT,
      label: 'BDT (৳)',
      symbolPrefix: true
    }
  };

  function getCurrency() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved && CURRENCIES[saved]) {
        return saved;
      }
    } catch (e) {}
    return DEFAULT_CURRENCY;
  }

  function setCurrency(code) {
    if (!CURRENCIES[code]) code = DEFAULT_CURRENCY;
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch (e) {}

    updatePills();
    updateAllPrices();

    // Dispatch global event for pages/components to react
    try {
      var event = new CustomEvent('rf_currency_change', {
        detail: {
          currency: code,
          rate: CURRENCIES[code].rate,
          symbol: CURRENCIES[code].symbol
        }
      });
      global.dispatchEvent(event);
    } catch (e) {}

    return code;
  }

  function toggleCurrency() {
    var current = getCurrency();
    var next = (current === 'USD') ? 'BDT' : 'USD';
    return setCurrency(next);
  }

  function convert(amountUsd, targetCurrency) {
    var code = targetCurrency || getCurrency();
    var info = CURRENCIES[code] || CURRENCIES.USD;
    var val = parseFloat(amountUsd) || 0;
    return val * info.rate;
  }

  function format(amountUsd, options) {
    var opts = options || {};
    var code = opts.currency || getCurrency();
    var info = CURRENCIES[code] || CURRENCIES.USD;
    var val = parseFloat(amountUsd) || 0;
    var converted = val * info.rate;

    var formattedNumber;
    if (typeof opts.decimals === 'number') {
      formattedNumber = converted.toLocaleString(undefined, {
        minimumFractionDigits: opts.decimals,
        maximumFractionDigits: opts.decimals
      });
    } else {
      // Default: rounded integer for hotel prices
      formattedNumber = Math.round(converted).toLocaleString();
    }

    var prefix = opts.prefix || '';
    var suffix = opts.suffix || '';
    return prefix + info.symbol + formattedNumber + suffix;
  }

  // Update all DOM elements bearing data-price-usd attributes
  function updateAllPrices(root) {
    var container = root || document;
    var elements = container.querySelectorAll('[data-price-usd]');
    var currentCurr = getCurrency();

    elements.forEach(function (el) {
      var usd = parseFloat(el.getAttribute('data-price-usd'));
      if (isNaN(usd)) return;

      var prefix = el.getAttribute('data-price-prefix') || '';
      var suffix = el.getAttribute('data-price-suffix') || '';
      var decimalsAttr = el.getAttribute('data-price-decimals');
      var decimals = (decimalsAttr !== null && decimalsAttr !== '') ? parseInt(decimalsAttr, 10) : undefined;

      el.textContent = format(usd, {
        currency: currentCurr,
        prefix: prefix,
        suffix: suffix,
        decimals: decimals
      });
    });
  }

  // Update active pill button state on all currency switchers
  function updatePills() {
    var curr = getCurrency();
    var switchers = document.querySelectorAll('.rf-currency-switcher');

    switchers.forEach(function (sw) {
      var buttons = sw.querySelectorAll('.rf-curr-btn');
      buttons.forEach(function (btn) {
        var c = btn.getAttribute('data-curr');
        if (c === curr) {
          btn.style.background = '#1e2e37';
          btn.style.color = '#ffffff';
          btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.18)';
          btn.setAttribute('aria-pressed', 'true');
        } else {
          btn.style.background = 'transparent';
          btn.style.color = '#71717a';
          btn.style.boxShadow = 'none';
          btn.setAttribute('aria-pressed', 'false');
        }
      });
    });
  }

  // Build a segmented toggle pill
  function createSwitcherElement(customClass) {
    var wrap = document.createElement('div');
    wrap.className = 'rf-currency-switcher flex items-center bg-[#f7f6f4] rounded-[30px] p-[2px] border border-[#e5e5e5] text-[12px] font-inter font-medium shrink-0 ' + (customClass || '');
    wrap.style.userSelect = 'none';
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'Currency selector');

    wrap.innerHTML =
      '<button type="button" class="rf-curr-btn px-[9px] py-[3.5px] rounded-[20px] transition-all duration-150 border-none cursor-pointer" data-curr="USD" style="font-family:Inter,sans-serif;font-size:11.5px;font-weight:600;">$ USD</button>' +
      '<button type="button" class="rf-curr-btn px-[9px] py-[3.5px] rounded-[20px] transition-all duration-150 border-none cursor-pointer" data-curr="BDT" style="font-family:Inter,sans-serif;font-size:11.5px;font-weight:600;">৳ BDT</button>';

    wrap.addEventListener('click', function (e) {
      var btn = e.target.closest('.rf-curr-btn');
      if (!btn) return;
      var code = btn.getAttribute('data-curr');
      if (code) setCurrency(code);
    });

    return wrap;
  }

  // Mount switcher in desktop navbar pill
  function mountNavbarSwitcher() {
    var signupBtn = document.getElementById('openSignupBtn');
    var loginBtn = document.getElementById('openLoginBtn');
    var targetContainer = signupBtn ? signupBtn.parentElement : (loginBtn ? loginBtn.parentElement : null);
    if (!targetContainer) {
      targetContainer = document.querySelector('.bg-white.rounded-\\[49px\\]');
    }
    if (!targetContainer) return;
    if (targetContainer.querySelector('.rf-currency-switcher')) return;

    var switcher = createSwitcherElement();
    if (signupBtn && signupBtn.parentElement === targetContainer) {
      targetContainer.insertBefore(switcher, signupBtn);
    } else if (loginBtn && loginBtn.parentElement === targetContainer) {
      targetContainer.insertBefore(switcher, loginBtn);
    } else {
      targetContainer.appendChild(switcher);
    }
  }

  // Mount switcher in mobile menu panel if present
  function mountMobileNavSwitcher() {
    var panelInner = document.querySelector('.mobile-nav-inner');
    if (!panelInner || panelInner.querySelector('.mobile-currency-row')) return;

    var row = document.createElement('div');
    row.className = 'mobile-currency-row mt-4 pt-4 border-t border-[#f0f0f0] flex items-center justify-between text-sm font-inter text-[#1e2e37]';
    row.innerHTML = '<span class="text-[#666] font-medium">Currency</span>';

    var switcher = createSwitcherElement();
    row.appendChild(switcher);
    panelInner.appendChild(row);
  }

  // Initialize on DOM ready
  function init() {
    mountNavbarSwitcher();
    mountMobileNavSwitcher();
    updatePills();
    updateAllPrices();

    // In case mobile nav loads dynamically later
    var observer = new MutationObserver(function () {
      if (document.querySelector('.mobile-nav-inner') && !document.querySelector('.mobile-currency-row')) {
        mountMobileNavSwitcher();
        updatePills();
      }
    });
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Public API
  var RFCurrency = {
    getCurrency: getCurrency,
    setCurrency: setCurrency,
    toggleCurrency: toggleCurrency,
    convert: convert,
    format: format,
    updateAllPrices: updateAllPrices,
    updatePills: updatePills,
    createSwitcherElement: createSwitcherElement,
    EXCHANGE_RATE_BDT: EXCHANGE_RATE_BDT,
    CURRENCIES: CURRENCIES
  };

  global.RFCurrency = RFCurrency;
})(window);
