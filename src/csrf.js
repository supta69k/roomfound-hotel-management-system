// ===== RoomFound Automatic CSRF Token Injection =====
(function () {
  'use strict';

  function getCsrfToken() {
    var match = document.cookie.match(/(?:^|;\s*)rf_csrf_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  // Intercept native fetch to attach X-CSRF-Token on non-GET same-origin requests
  if (typeof window.fetch === 'function') {
    var originalFetch = window.fetch;
    window.fetch = function (resource, init) {
      init = init || {};
      var method = (init.method || 'GET').toUpperCase();
      if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
        var token = getCsrfToken();
        if (token) {
          if (!init.headers) {
            init.headers = { 'X-CSRF-Token': token };
          } else if (typeof Headers !== 'undefined' && init.headers instanceof Headers) {
            if (!init.headers.has('X-CSRF-Token')) {
              init.headers.set('X-CSRF-Token', token);
            }
          } else if (Array.isArray(init.headers)) {
            var exists = init.headers.some(function (h) {
              return String(h[0]).toLowerCase() === 'x-csrf-token';
            });
            if (!exists) {
              init.headers.push(['X-CSRF-Token', token]);
            }
          } else if (typeof init.headers === 'object') {
            if (!init.headers['X-CSRF-Token'] && !init.headers['x-csrf-token']) {
              init.headers['X-CSRF-Token'] = token;
            }
          }
        }
      }
      return originalFetch.call(this, resource, init);
    };
  }

  // Expose helper globally
  window.getCsrfToken = getCsrfToken;
})();
