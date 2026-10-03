// ===== Hotel Management Auth System =====
(function () {
  var API_BASE = '../api';

  // ===== ELEMENTS =====
  var loginOverlay = document.getElementById('loginOverlay');
  var signupOverlay = document.getElementById('signupOverlay');
  var verifyOverlay = document.getElementById('verifyOverlay');
  var toastEl = document.getElementById('toastContainer');

  // Login
  var openLoginBtn = document.getElementById('openLoginBtn');
  var closeLoginBtn = document.getElementById('closeLoginBtn');
  var loginSubmitBtn = document.getElementById('loginSubmitBtn');
  var loginEmail = document.getElementById('loginEmail');
  var loginPassword = document.getElementById('loginPassword');
  var togglePwdBtn = document.getElementById('togglePasswordBtn');

  // Signup
  var openSignupBtn = document.getElementById('openSignupBtn');
  var closeSignupBtn = document.getElementById('closeSignupBtn');
  var signupSubmitBtn = document.getElementById('signupSubmitBtn');
  var signupName = document.getElementById('signupName');
  var signupEmail = document.getElementById('signupEmail');
  var signupPassword = document.getElementById('signupPassword');
  var signupConfirmPassword = document.getElementById('signupConfirmPassword');
  var toggleSignupPwdBtn = document.getElementById('toggleSignupPwdBtn');
  var toggleSignupConfirmPwdBtn = document.getElementById('toggleSignupConfirmPwdBtn');

  // Verify
  var closeVerifyBtn = document.getElementById('closeVerifyBtn');
  var verifySubmitBtn = document.getElementById('verifySubmitBtn');
  var resendCodeBtn = document.getElementById('resendCodeBtn');
  var verifySubtext = document.getElementById('verifySubtext');
  var otpInputs = document.querySelectorAll('.otp-input');

  // Navigation links
  var goToSignup = document.getElementById('goToSignup');
  var goToSignin = document.getElementById('goToSignin');

  // Forgot password
  var forgotOverlay = document.getElementById('forgotOverlay');
  var forgotPasswordLink = document.getElementById('forgotPasswordLink');
  var closeForgotBtn = document.getElementById('closeForgotBtn');
  var backToLogin = document.getElementById('backToLogin');
  var forgotRequestBtn = document.getElementById('forgotRequestBtn');
  var forgotResetBtn = document.getElementById('forgotResetBtn');
  var forgotResendBtn = document.getElementById('forgotResendBtn');
  var forgotStepEmail = document.getElementById('forgotStepEmail');
  var forgotStepReset = document.getElementById('forgotStepReset');
  var forgotSubtext = document.getElementById('forgotSubtext');
  var forgotEmail = document.getElementById('forgotEmail');
  var forgotCode = document.getElementById('forgotCode');
  var forgotNewPassword = document.getElementById('forgotNewPassword');

  // Password visibility state
  var loginPwdVisible = false;
  var signupPwdVisible = false;
  var signupConfirmPwdVisible = false;

  // ===== TOAST =====
  var toastTimeout;
  function showToast(message, type) {
    clearTimeout(toastTimeout);
    toastEl.textContent = message;
    toastEl.className = 'toast ' + type;
    // trigger reflow
    void toastEl.offsetWidth;
    toastEl.classList.add('show');
    toastTimeout = setTimeout(function () {
      toastEl.classList.remove('show');
    }, 4000);
  }

  // ===== MODAL HELPERS =====
  function openModal(overlay) {
    overlay.classList.add('active');
  }
  function closeModal(overlay) {
    overlay.classList.remove('active');
  }
  function closeAllModals() {
    closeModal(loginOverlay);
    closeModal(signupOverlay);
    closeModal(verifyOverlay);
    if (forgotOverlay) closeModal(forgotOverlay);
  }

  function showForgotStep(step) {
    if (!forgotStepEmail || !forgotStepReset) return;
    if (step === 'email') {
      forgotStepEmail.classList.remove('hidden');
      forgotStepReset.classList.add('hidden');
      forgotSubtext.textContent = "Enter your account email and we'll send you a reset code";
    } else {
      forgotStepEmail.classList.add('hidden');
      forgotStepReset.classList.remove('hidden');
      forgotSubtext.textContent = 'Enter the 6-digit code we sent to ' + forgotEmail.value.trim();
    }
  }

  function requestResetCode() {
    var email = forgotEmail.value.trim();
    if (!email) {
      showToast('Please enter your email address.', 'error');
      return;
    }
    setLoading(forgotRequestBtn, true);
    apiCall('forgot_password.php', 'POST', { action: 'request', email: email }, function (err, data) {
      setLoading(forgotRequestBtn, false);
      if (err || !data) {
        showToast('Network error. Please try again.', 'error');
        return;
      }
      showToast(data.message, data.success ? 'success' : 'error');
      if (data.success) {
        showForgotStep('reset');
      }
    });
  }

  if (forgotOverlay && forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', function () {
      closeModal(loginOverlay);
      showForgotStep('email');
      openModal(forgotOverlay);
    });
    closeForgotBtn.addEventListener('click', function () { closeModal(forgotOverlay); });
    backToLogin.addEventListener('click', function () {
      closeModal(forgotOverlay);
      openModal(loginOverlay);
    });
    forgotRequestBtn.addEventListener('click', requestResetCode);
    forgotResendBtn.addEventListener('click', requestResetCode);

    forgotResetBtn.addEventListener('click', function () {
      var code = (forgotCode.value || '').trim();
      var newPassword = forgotNewPassword.value;
      if (code.length !== 6) {
        showToast('Please enter the 6-digit reset code.', 'error');
        return;
      }
      if (newPassword.length < 8) {
        showToast('Password must be at least 8 characters.', 'error');
        return;
      }
      setLoading(forgotResetBtn, true);
      apiCall('forgot_password.php', 'POST', {
        action: 'reset',
        email: forgotEmail.value.trim(),
        code: code,
        new_password: newPassword
      }, function (err, data) {
        setLoading(forgotResetBtn, false);
        if (err || !data) {
          showToast('Network error. Please try again.', 'error');
          return;
        }
        showToast(data.message, data.success ? 'success' : 'error');
        if (data.success) {
          forgotCode.value = '';
          forgotNewPassword.value = '';
          closeModal(forgotOverlay);
          openModal(loginOverlay);
        }
      });
    });

    forgotCode.addEventListener('input', function () {
      this.value = this.value.replace(/[^0-9]/g, '');
    });
  }

  // ===== BUTTON LOADING STATE =====
  function setLoading(btn, loading) {
    if (loading) {
      btn.disabled = true;
      btn.dataset.origText = btn.textContent;
      btn.innerHTML = '<span class="spinner"></span>Please wait...';
    } else {
      btn.disabled = false;
      btn.textContent = btn.dataset.origText || 'Get started';
    }
  }

  // ===== PASSWORD TOGGLE =====
  function toggleEyeIcon(iconEl, visible) {
    if (visible) {
      iconEl.innerHTML = '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="#666" stroke-width="1.5"/><circle cx="12" cy="12" r="3" stroke="#666" stroke-width="1.5"/>';
    } else {
      iconEl.innerHTML = '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="#666" stroke-width="1.5"/><circle cx="12" cy="12" r="3" stroke="#666" stroke-width="1.5"/><line x1="4" y1="4" x2="20" y2="20" stroke="#666" stroke-width="1.5" stroke-linecap="round"/>';
    }
  }

  togglePwdBtn.addEventListener('click', function () {
    loginPwdVisible = !loginPwdVisible;
    loginPassword.type = loginPwdVisible ? 'text' : 'password';
    toggleEyeIcon(document.getElementById('eyeIcon'), loginPwdVisible);
  });

  toggleSignupPwdBtn.addEventListener('click', function () {
    signupPwdVisible = !signupPwdVisible;
    signupPassword.type = signupPwdVisible ? 'text' : 'password';
    toggleEyeIcon(document.getElementById('signupEyeIcon'), signupPwdVisible);
  });

  toggleSignupConfirmPwdBtn.addEventListener('click', function () {
    signupConfirmPwdVisible = !signupConfirmPwdVisible;
    signupConfirmPassword.type = signupConfirmPwdVisible ? 'text' : 'password';
    toggleEyeIcon(document.getElementById('signupConfirmEyeIcon'), signupConfirmPwdVisible);
  });

  // ===== MODAL OPEN/CLOSE =====
  openLoginBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    openModal(loginOverlay);
  });
  openSignupBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    openModal(signupOverlay);
  });

  closeLoginBtn.addEventListener('click', function () { closeModal(loginOverlay); });
  closeSignupBtn.addEventListener('click', function () { closeModal(signupOverlay); });
  closeVerifyBtn.addEventListener('click', function () { closeModal(verifyOverlay); });

  // Close on overlay click
  [loginOverlay, signupOverlay, verifyOverlay].forEach(function (ov) {
    ov.addEventListener('click', function (e) {
      if (e.target === ov) closeModal(ov);
    });
  });

  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAllModals();
  });

  // Navigate between modals
  goToSignup.addEventListener('click', function () {
    closeModal(loginOverlay);
    openModal(signupOverlay);
  });
  goToSignin.addEventListener('click', function () {
    closeModal(signupOverlay);
    openModal(loginOverlay);
  });

  // ===== OTP INPUT BEHAVIOR =====
  otpInputs.forEach(function (input, idx) {
    input.addEventListener('input', function () {
      // Only allow digits
      this.value = this.value.replace(/[^0-9]/g, '');
      if (this.value && idx < otpInputs.length - 1) {
        otpInputs[idx + 1].focus();
      }
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Backspace' && !this.value && idx > 0) {
        otpInputs[idx - 1].focus();
      }
    });
    // Handle paste
    input.addEventListener('paste', function (e) {
      e.preventDefault();
      var pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
      for (var i = 0; i < otpInputs.length && i < pasted.length; i++) {
        otpInputs[i].value = pasted[i];
      }
      var focusIdx = Math.min(pasted.length, otpInputs.length - 1);
      otpInputs[focusIdx].focus();
    });
  });

  function getOTPValue() {
    var code = '';
    otpInputs.forEach(function (inp) { code += inp.value; });
    return code;
  }
  function clearOTP() {
    otpInputs.forEach(function (inp) { inp.value = ''; });
    otpInputs[0].focus();
  }

  // ===== API HELPER =====
  function apiCall(endpoint, method, body, callback) {
    var options = {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    };
    if (body) options.body = JSON.stringify(body);

    fetch(API_BASE + '/' + endpoint, options)
      .then(function (res) { return res.json(); })
      .then(function (data) { callback(null, data); })
      .catch(function (err) { callback(err, null); });
  }

  // ===== SIGNUP =====
  signupSubmitBtn.addEventListener('click', function () {
    var name = signupName.value.trim();
    var email = signupEmail.value.trim();
    var password = signupPassword.value;
    var confirmPassword = signupConfirmPassword.value;

    if (!name || !email || !password || !confirmPassword) {
      showToast('Please fill in all fields.', 'error');
      return;
    }
    if (password.length < 8) {
      showToast('Password must be at least 8 characters.', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    setLoading(signupSubmitBtn, true);

    apiCall('signup.php', 'POST', {
      full_name: name,
      email: email,
      password: password,
      confirm_password: confirmPassword
    }, function (err, data) {
      setLoading(signupSubmitBtn, false);
      if (err) {
        showToast('Network error. Please try again.', 'error');
        return;
      }
      if (!data.success) {
        showToast(data.message, 'error');
        return;
      }
      // Success — show verification modal
      showToast(data.message, 'success');
      closeModal(signupOverlay);
      verifySubtext.textContent = 'Enter the 6-digit code sent to ' + (data.email || 'your email');
      if (data.dev_code) {
        verifySubtext.textContent += ' — offline demo mode, your code: ' + data.dev_code;
      }
      clearOTP();
      openModal(verifyOverlay);
    });
  });

  // ===== LOGIN =====
  loginSubmitBtn.addEventListener('click', function () {
    var email = loginEmail.value.trim();
    var password = loginPassword.value;

    if (!email || !password) {
      showToast('Please fill in all fields.', 'error');
      return;
    }

    setLoading(loginSubmitBtn, true);

    apiCall('login.php', 'POST', {
      email: email,
      password: password
    }, function (err, data) {
      setLoading(loginSubmitBtn, false);
      if (err) {
        showToast('Network error. Please try again.', 'error');
        return;
      }
      if (!data.success) {
        showToast(data.message, 'error');
        return;
      }
      // Success
      showToast('Welcome back, ' + data.user.name + '!', 'success');
      closeModal(loginOverlay);
      updateUIForLoggedInUser(data.user);
      // Redirect admin to dashboard
      if (data.user.role === 'admin') {
        setTimeout(function () { window.location.href = './admin.html'; }, 500);
      } else if (data.user.role === 'manager') {
        setTimeout(function () { window.location.href = './manager.html'; }, 500);
      } else if (data.user.role === 'waiter') {
        setTimeout(function () { window.location.href = './waiter.html'; }, 500);
      }
    });
  });

  // ===== VERIFY =====
  verifySubmitBtn.addEventListener('click', function () {
    var code = getOTPValue();
    if (code.length !== 6) {
      showToast('Please enter the full 6-digit code.', 'error');
      return;
    }

    setLoading(verifySubmitBtn, true);

    apiCall('verify.php', 'POST', {
      code: code,
      action: 'verify'
    }, function (err, data) {
      setLoading(verifySubmitBtn, false);
      if (err) {
        showToast('Network error. Please try again.', 'error');
        return;
      }
      if (!data.success) {
        showToast(data.message, 'error');
        return;
      }
      showToast(data.message, 'success');
      closeModal(verifyOverlay);
      updateUIForLoggedInUser(data.user);
    });
  });

  // ===== RESEND CODE =====
  resendCodeBtn.addEventListener('click', function () {
    apiCall('verify.php', 'POST', {
      action: 'resend'
    }, function (err, data) {
      if (err) {
        showToast('Network error. Please try again.', 'error');
        return;
      }
      if (!data.success) {
        showToast(data.message, 'error');
        return;
      }
      showToast('New code sent!', 'success');
      clearOTP();
    });
  });

  // ===== ENTER KEY SUBMIT =====
  loginPassword.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') loginSubmitBtn.click();
  });
  signupConfirmPassword.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') signupSubmitBtn.click();
  });

  // ===== UPDATE UI AFTER LOGIN =====
  function updateUIForLoggedInUser(user) {
    var navBar = openLoginBtn.parentElement;

    // Hide sign in / sign up buttons
    openLoginBtn.style.display = 'none';
    openSignupBtn.style.display = 'none';

    // Check if user menu already exists
    if (document.getElementById('userMenuBtn')) return;

    var firstLetter = user.name.charAt(0).toUpperCase();

    // Create profile avatar link
    var profileLink = document.createElement('a');
    profileLink.href = './profile.html';
    profileLink.id = 'userMenuBtn';
    profileLink.style.cssText = 'text-decoration:none; display:flex; align-items:center; gap:10px; cursor:pointer;';
    profileLink.innerHTML = '<span style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#1e2e37,#3a5a6a);color:white;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:600;font-family:Inter,sans-serif;transition:transform 0.15s ease;">' + firstLetter + '</span>';
    navBar.appendChild(profileLink);

    // Show admin panel link if admin
    if (user.role === 'admin' || user.role === 'manager' || user.role === 'waiter') {
      var dashboardHref = user.role === 'admin' ? './admin.html' : (user.role === 'manager' ? './manager.html' : './waiter.html');
      var dashboardLabel = user.role === 'admin' ? 'Admin Panel' : (user.role === 'manager' ? 'My Dashboard' : 'My Dashboard');
      var adminLink = document.createElement('a');
      adminLink.href = dashboardHref;
      adminLink.id = 'adminPanelLink';
      adminLink.style.cssText = 'text-decoration:none; display:inline-block; padding:12px 24px; border-radius:32px; font-size:14px; font-weight:500; color:white; font-family:Inter,sans-serif; letter-spacing:-0.7px; line-height:1.8; white-space:nowrap; background:linear-gradient(111deg,rgb(63,63,63) 18%,rgb(21,21,21) 77%); box-shadow:inset 0px 4px 12px 0px #081738; cursor:pointer;';
      adminLink.textContent = dashboardLabel;
      navBar.appendChild(adminLink);
    }

    // Create logout button
    var logoutBtn = document.createElement('button');
    logoutBtn.id = 'logoutBtn';
    logoutBtn.className = 'btn-signin relative overflow-hidden rounded-[32px] px-[24px] py-[12px] text-[14px] font-medium text-white tracking-[-0.7px] leading-[1.8] whitespace-nowrap';
    logoutBtn.style.cssText = 'background-image: linear-gradient(111deg, rgb(63, 63, 63) 18%, rgb(21, 21, 21) 77%); box-shadow: inset 0px 4px 12px 0px #081738;';
    logoutBtn.textContent = 'Log Out';
    navBar.appendChild(logoutBtn);

    logoutBtn.addEventListener('click', function () {
      apiCall('logout.php', 'POST', null, function (err, data) {
        showToast('Logged out successfully.', 'success');
        openLoginBtn.style.display = '';
        openSignupBtn.style.display = '';
        profileLink.remove();
        logoutBtn.remove();
        var adminEl = document.getElementById('adminPanelLink');
        if (adminEl) adminEl.remove();
      });
    });
  }

  // ===== CHECK SESSION ON PAGE LOAD =====
  apiCall('session.php', 'GET', null, function (err, data) {
    if (!err && data && data.success) {
      updateUIForLoggedInUser(data.user);
    }
  });

  // Allow other pages to deep-link straight into a modal (index.html?login=1)
  var pageParams = new URLSearchParams(window.location.search);
  if (pageParams.get('login') === '1') openModal(loginOverlay);
  if (pageParams.get('signup') === '1') openModal(signupOverlay);

  // Exposed for the mobile hamburger menu: open a modal without navigating
  window.rfOpenAuth = function (which) {
    if (which === 'signup') openModal(signupOverlay);
    else openModal(loginOverlay);
  };

})();
