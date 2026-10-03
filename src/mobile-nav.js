// ===== Mobile Hamburger Navigation =====
// On screens < 768px the navbar pill collapses to a single menu button that
// opens a dropdown with the page links and auth actions. Desktop is untouched.
(function () {
  var loginBtn = document.getElementById('openLoginBtn');
  if (!loginBtn || !loginBtn.parentElement) return;

  var pill = loginBtn.parentElement;
  pill.classList.add('rf-nav-pill');

  // --- Toggle button inside the pill ---
  var toggle = document.createElement('button');
  toggle.id = 'mobileNavToggle';
  toggle.className = 'mobile-nav-toggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-label', 'Open menu');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = '<span class="mobile-nav-bar"></span><span class="mobile-nav-bar"></span><span class="mobile-nav-bar"></span>';
  pill.appendChild(toggle);

  // --- Dropdown panel ---
  var panel = document.createElement('div');
  panel.id = 'mobileNavPanel';
  panel.setAttribute('aria-hidden', 'true');
  document.body.appendChild(panel);

  var current = (window.location.pathname.split('/').pop() || 'index.html').split('?')[0];
  function link(href, label) {
    var active = current === href.split('?')[0].split('/').pop() ? ' active' : '';
    return '<a href="' + href + '" class="mobile-nav-link' + active + '">' + label + '</a>';
  }

  var linksHtml =
    link('./index.html', 'Home') +
    link('./loyalty.html', 'Loyalty Program') +
    link('./support.html', 'Support');

  panel.innerHTML = '<div class="mobile-nav-inner">' +
    '<nav class="mobile-nav-links">' + linksHtml + '</nav>' +
    '<div class="mobile-nav-auth" id="mobileNavAuth"></div>' +
    '</div>';

  var authArea = document.getElementById('mobileNavAuth');
  var sessionLoaded = false;

  function renderGuest() {
    authArea.innerHTML =
      '<button type="button" class="mobile-nav-btn mobile-nav-btn-primary" data-auth="login">Sign In</button>' +
      '<button type="button" class="mobile-nav-btn mobile-nav-btn-ghost" data-auth="signup">Sign Up</button>';
  }

  function renderUser(user) {
    var name = user && user.name ? String(user.name) : 'User';
    var letter = name.charAt(0).toUpperCase() || 'U';
    var html = '<div class="mobile-nav-user">' +
      '<span class="mobile-nav-avatar">' + letter + '</span>' +
      '<span class="mobile-nav-name">' + name.replace(/</g, '&lt;') + '</span>' +
      '</div>';
    if (user.role === 'admin') {
      html += '<a href="./admin.html" class="mobile-nav-link">Admin Panel</a>';
    } else if (user.role === 'manager') {
      html += '<a href="./manager.html" class="mobile-nav-link">My Dashboard</a>';
    } else if (user.role === 'waiter') {
      html += '<a href="./waiter.html" class="mobile-nav-link">My Dashboard</a>';
    } else {
      html += '<a href="./profile.html" class="mobile-nav-link">My Profile</a>';
    }
    html += '<button type="button" class="mobile-nav-btn mobile-nav-btn-primary" id="mobileNavLogout">Log Out</button>';
    authArea.innerHTML = html;

    var logoutBtn = document.getElementById('mobileNavLogout');
    logoutBtn.addEventListener('click', function () {
      fetch('../api/logout.php', { method: 'POST', credentials: 'include' })
        .finally(function () { window.location.reload(); });
    });
  }

  function refreshAuthState() {
    return fetch('../api/session.php', { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.success && data.user) renderUser(data.user);
        else renderGuest();
        sessionLoaded = true;
      })
      .catch(function () {
        if (!sessionLoaded) renderGuest();
      });
  }

  renderGuest();
  refreshAuthState();

  authArea.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-auth]');
    if (!btn) return;
    var which = btn.getAttribute('data-auth');
    if (typeof window.rfOpenAuth === 'function') {
      window.rfOpenAuth(which);
      closePanel();
    } else {
      window.location.href = './index.html?' + which + '=1';
    }
  });

  // --- Open / close ---
  function openPanel() {
    refreshAuthState(); // always current — the user may have logged in/out since load
    panel.classList.add('open');
    toggle.classList.add('active');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    panel.setAttribute('aria-hidden', 'false');
  }
  function closePanel() {
    panel.classList.remove('open');
    toggle.classList.remove('active');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    panel.setAttribute('aria-hidden', 'true');
  }

  toggle.addEventListener('click', function (e) {
    e.stopPropagation();
    if (panel.classList.contains('open')) closePanel();
    else openPanel();
  });

  document.addEventListener('click', function (e) {
    if (!panel.classList.contains('open')) return;
    if (panel.contains(e.target) || toggle.contains(e.target)) return;
    closePanel();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closePanel();
  });

  panel.addEventListener('click', function (e) {
    if (e.target.closest('.mobile-nav-link')) closePanel();
  });
})();
