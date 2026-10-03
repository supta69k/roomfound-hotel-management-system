// Keep navbar auth state consistent across pages using server session.
(function () {
  var API_BASE = '../api';

  function qs(id) {
    return document.getElementById(id);
  }

  var openSignupBtn = qs('openSignupBtn');
  var openLoginBtn = qs('openLoginBtn');

  // This script only runs on pages that include the shared homepage-style navbar.
  if (!openSignupBtn || !openLoginBtn || !openLoginBtn.parentElement) {
    return;
  }

  var navBar = openLoginBtn.parentElement;

  // ===== HIGHLIGHT ACTIVE PAGE IN NAVBAR =====
  function highlightActivePage() {
    var currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // Find the navbar menu container (the div with menu items)
    var navbar = openLoginBtn.closest('.bg-white');
    if (!navbar) return;
    
    // Get all menu items (spans and links before the buttons)
    var menuItems = navbar.querySelectorAll('a, span');
    
    menuItems.forEach(function (item) {
      var href = item.getAttribute('href') || '';
      var isActive = false;
      
      // Check if this link/span corresponds to current page
      if (href && href.includes('index.html') && currentPage === 'index.html') {
        isActive = true;
      } else if (href && href.includes('loyalty.html') && currentPage === 'loyalty.html') {
        isActive = true;
      } else if (href && href.includes('support.html') && currentPage === 'support.html') {
        isActive = true;
      }
      
      // Apply styling
      if (isActive) {
        item.style.opacity = '1';
        item.style.color = '#1e2e37';
        item.style.fontWeight = '600';
      } else if (href) {
        // Reduce opacity for non-active links
        item.style.opacity = '0.5';
        item.style.transition = 'opacity 0.2s ease';
      }
    });
  }

  // Run on page load
  highlightActivePage();

  function setGuestUI() {
    openSignupBtn.style.display = '';
    openLoginBtn.style.display = '';

    var existingProfile = qs('userMenuBtn');
    var existingLogout = qs('logoutBtn');
    var existingAdmin = qs('adminPanelLink');
    if (existingProfile) existingProfile.remove();
    if (existingLogout) existingLogout.remove();
    if (existingAdmin) existingAdmin.remove();
  }

  function setUserUI(user) {
    openSignupBtn.style.display = 'none';
    openLoginBtn.style.display = 'none';

    if (qs('userMenuBtn')) return;

    var name = user && user.name ? String(user.name) : 'User';
    var firstLetter = name.charAt(0).toUpperCase() || 'U';

    var profileLink = document.createElement('a');
    profileLink.href = './profile.html';
    profileLink.id = 'userMenuBtn';
    profileLink.style.cssText = 'text-decoration:none; display:flex; align-items:center; gap:10px; cursor:pointer;';
    profileLink.innerHTML = '<span style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#1e2e37,#3a5a6a);color:white;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:600;font-family:Inter,sans-serif;transition:transform 0.15s ease;">' + firstLetter + '</span>';
    navBar.appendChild(profileLink);

    if (user && user.role === 'admin') {
      var adminLink = document.createElement('a');
      adminLink.href = './admin.html';
      adminLink.id = 'adminPanelLink';
      adminLink.style.cssText = 'text-decoration:none; display:inline-block; padding:12px 24px; border-radius:32px; font-size:14px; font-weight:500; color:white; font-family:Inter,sans-serif; letter-spacing:-0.7px; line-height:1.8; white-space:nowrap; background:linear-gradient(111deg,rgb(63,63,63) 18%,rgb(21,21,21) 77%); box-shadow:inset 0px 4px 12px 0px #081738; cursor:pointer;';
      adminLink.textContent = 'Admin Panel';
      navBar.appendChild(adminLink);
    }

    var logoutBtn = document.createElement('button');
    logoutBtn.id = 'logoutBtn';
    logoutBtn.className = 'btn-signin relative overflow-hidden rounded-[32px] px-[24px] py-[12px] text-[14px] font-medium text-white tracking-[-0.7px] leading-[1.8] whitespace-nowrap';
    logoutBtn.style.cssText = 'background-image: linear-gradient(111deg, rgb(63, 63, 63) 18%, rgb(21, 21, 21) 77%); box-shadow: inset 0px 4px 12px 0px #081738;';
    logoutBtn.textContent = 'Log Out';
    navBar.appendChild(logoutBtn);

    logoutBtn.addEventListener('click', function () {
      fetch(API_BASE + '/logout.php', {
        method: 'POST',
        credentials: 'include'
      }).finally(function () {
        window.location.reload();
      });
    });
  }

  fetch(API_BASE + '/session.php', {
    method: 'GET',
    credentials: 'include'
  })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data && data.success && data.user) {
        setUserUI(data.user);
      } else {
        setGuestUI();
      }
    })
    .catch(function () {
      setGuestUI();
    });
})();