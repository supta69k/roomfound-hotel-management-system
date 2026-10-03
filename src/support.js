// ===== Support / Contact Page Logic =====
(function () {
  var API_BASE = '../api';

  // ===== ELEMENTS =====
  var form = document.getElementById('supportForm');
  var firstName = document.getElementById('firstName');
  var lastName = document.getElementById('lastName');
  var country = document.getElementById('country');
  var phone = document.getElementById('phone');
  var emailAddress = document.getElementById('emailAddress');
  var message = document.getElementById('message');
  var termsRow = document.getElementById('termsRow');
  var termsCheckbox = document.getElementById('termsCheckbox');
  var termsCheck = document.getElementById('termsCheck');
  var submitBtn = document.getElementById('submitBtn');
  var toastEl = document.getElementById('toastContainer');
  var supportStage = document.getElementById('supportStage');
  var supportScaleBox = document.getElementById('supportScaleBox');
  var supportFrame = document.getElementById('supportFrame');

  var termsAccepted = false;
  var submitting = false;

  function syncSupportScale() {
    if (!supportStage || !supportScaleBox || !supportFrame) {
      return;
    }

    var baseWidth = 1224;
    var baseHeight = 801;
    var availableWidth = supportStage.clientWidth;
    var scale = Math.min(1, availableWidth / baseWidth);

    supportScaleBox.style.width = Math.round(baseWidth * scale) + 'px';
    supportScaleBox.style.height = Math.round(baseHeight * scale) + 'px';
    supportFrame.style.transform = 'scale(' + scale + ')';
    supportFrame.style.transformOrigin = 'top left';
  }

  // ===== TOAST =====
  var toastTimeout;
  function showToast(msg, type) {
    clearTimeout(toastTimeout);
    toastEl.textContent = msg;
    toastEl.style.background = type === 'error' ? '#c0392b' : '#1e2e37';
    toastEl.style.transform = 'translateX(0)';
    toastEl.style.pointerEvents = 'auto';
    toastTimeout = setTimeout(function () {
      toastEl.style.transform = 'translateX(calc(100% + 40px))';
      toastEl.style.pointerEvents = 'none';
    }, 4000);
  }

  // ===== COUNTRY DROPDOWN =====
  var countries = [
    'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Australia', 'Austria',
    'Bangladesh', 'Belgium', 'Bhutan', 'Brazil', 'Canada', 'Chile', 'China',
    'Colombia', 'Denmark', 'Egypt', 'Finland', 'France', 'Germany', 'Greece',
    'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Italy', 'Japan',
    'Jordan', 'Kenya', 'Kuwait', 'Lebanon', 'Malaysia', 'Maldives', 'Mexico',
    'Morocco', 'Myanmar', 'Nepal', 'Netherlands', 'New Zealand', 'Nigeria',
    'Norway', 'Oman', 'Pakistan', 'Philippines', 'Poland', 'Portugal', 'Qatar',
    'Russia', 'Saudi Arabia', 'Singapore', 'South Africa', 'South Korea', 'Spain',
    'Sri Lanka', 'Sweden', 'Switzerland', 'Thailand', 'Turkey', 'UAE',
    'United Kingdom', 'United States', 'Vietnam'
  ];

  countries.forEach(function (c) {
    var opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    country.appendChild(opt);
  });

  syncSupportScale();
  window.addEventListener('resize', syncSupportScale);

  // ===== COUNTRY SELECT COLOR =====
  country.addEventListener('change', function () {
    if (country.value) {
      country.style.color = '#000';
    } else {
      country.style.color = 'rgba(152,151,155,0.66)';
    }
  });

  // ===== TERMS CHECKBOX =====
  termsRow.addEventListener('click', function () {
    termsAccepted = !termsAccepted;
    if (termsAccepted) {
      termsCheckbox.style.background = '#1e2e37';
      termsCheckbox.style.borderColor = '#1e2e37';
      termsCheck.style.opacity = '1';
    } else {
      termsCheckbox.style.background = 'transparent';
      termsCheckbox.style.borderColor = '#bfbfbf';
      termsCheck.style.opacity = '0';
    }
    validateForm();
  });

  // ===== FORM VALIDATION =====
  function validateForm() {
    var valid = firstName.value.trim() !== '' &&
      lastName.value.trim() !== '' &&
      emailAddress.value.trim() !== '' &&
      message.value.trim() !== '' &&
      termsAccepted;
    submitBtn.disabled = !valid;
    return valid;
  }

  [firstName, lastName, country, phone, emailAddress, message].forEach(function (el) {
    el.addEventListener('input', validateForm);
  });

  // ===== API CALL =====
  function apiCall(endpoint, method, body, callback) {
    var options = {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    };
    if (body) options.body = JSON.stringify(body);

    fetch(API_BASE + '/' + endpoint, options)
      .then(function (r) { return r.json(); })
      .then(function (d) { callback(null, d); })
      .catch(function (e) { callback(e, null); });
  }

  // ===== FORM SUBMIT =====
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (submitting || !validateForm()) return;

    // Client-side email validation
    var emailVal = emailAddress.value.trim();
    var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(emailVal)) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }

    submitting = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    var payload = {
      first_name: firstName.value.trim(),
      last_name: lastName.value.trim(),
      country: country.value,
      phone: phone.value.trim(),
      email: emailVal,
      message: message.value.trim()
    };

    apiCall('support.php', 'POST', payload, function (err, data) {
      submitting = false;
      submitBtn.textContent = 'Submit';

      if (err || !data || !data.success) {
        showToast((data && data.message) || 'Something went wrong. Please try again.', 'error');
        validateForm();
        return;
      }

      // Success — show modal and reset form
      if (window.rfModal) {
        window.rfModal.success({
          title: 'Message Sent!',
          message: 'Thank you for contacting us. Our team will get back to you within 24 hours.',
          btnText: 'Got it'
        });
      } else {
        showToast('Message sent successfully!', 'success');
      }

      // Reset form
      form.reset();
      country.style.color = 'rgba(152,151,155,0.66)';
      termsAccepted = false;
      termsCheckbox.style.background = 'transparent';
      termsCheckbox.style.borderColor = '#bfbfbf';
      termsCheck.style.opacity = '0';
      submitBtn.disabled = true;
    });
  });
})();
