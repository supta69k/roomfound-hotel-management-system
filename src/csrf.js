// ===== RoomFound Automatic CSRF Token Injection =====
(function () {
  'use strict';

  function getCsrfToken() {
    var match = document.cookie.match(/(?:^|;\s*)rf_csrf_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  // ===== Free-hosting bot check (InfinityFree "__test" cookie) =====
  // The host answers any request that lacks its __test cookie with a small
  // JavaScript challenge page instead of the real response. Page loads pass it
  // automatically, but fetch() just receives that HTML and JSON parsing fails.
  // When that happens, solve the challenge in a hidden same-origin iframe and
  // retry the request once. Has no effect where the host has no such check.
  function isHostChallenge(res) {
    var type = res.headers.get('Content-Type') || '';
    if (type.indexOf('json') !== -1) return Promise.resolve(false);
    return res.clone().text().then(function (body) {
      return body.indexOf('aes.js') !== -1 && body.indexOf('__test=') !== -1;
    }, function () { return false; });
  }

  var pendingChallenge = null;
  function solveHostChallenge() {
    if (pendingChallenge) return pendingChallenge;
    pendingChallenge = new Promise(function (resolve) {
      var frame = document.createElement('iframe');
      var done = false;
      function finish() {
        if (done) return;
        done = true;
        clearTimeout(timer);
        if (frame.parentNode) frame.parentNode.removeChild(frame);
        pendingChallenge = null;
        resolve();
      }
      // The challenge page sets the cookie and then redirects; once the frame
      // shows a page without the challenge script, the cookie is in place.
      frame.onload = function () {
        try {
          var html = frame.contentDocument ? frame.contentDocument.documentElement.innerHTML : '';
          if (html.indexOf('aes.js') === -1) finish();
        } catch (e) { finish(); }
      };
      var timer = setTimeout(finish, 10000);
      frame.style.display = 'none';
      frame.src = new URL('../api/session.php', window.location.href).href;
      document.body.appendChild(frame);
    });
    return pendingChallenge;
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
      var request = originalFetch.call(this, resource, init);
      // Only string URLs can be safely re-sent (a Request body is single-use).
      if (typeof resource !== 'string') return request;
      return request.then(function (res) {
        return isHostChallenge(res).then(function (blocked) {
          if (!blocked) return res;
          return solveHostChallenge().then(function () {
            return originalFetch.call(window, resource, init);
          });
        });
      });
    };
  }

  // Expose helper globally
  window.getCsrfToken = getCsrfToken;
})();
