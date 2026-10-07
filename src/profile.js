// ===== Profile Page Logic =====
(function () {
  var API_BASE = '../api';
  var toastEl = document.getElementById('toastContainer');
  var toastTimeout;

  function showToast(message, type) {
    clearTimeout(toastTimeout);
    toastEl.textContent = message;
    toastEl.className = 'toast ' + type;
    void toastEl.offsetWidth;
    toastEl.classList.add('show');
    toastTimeout = setTimeout(function () { toastEl.classList.remove('show'); }, 4000);
  }

  function apiCall(endpoint, method, body, callback) {
    var options = { method: method, headers: { 'Content-Type': 'application/json' }, credentials: 'include' };
    if (body) options.body = JSON.stringify(body);
    fetch(API_BASE + '/' + endpoint, options)
      .then(function (r) {
        return r.json().catch(function () { return null; }).then(function (d) {
          if (d === null) callback(new Error('Invalid server response.'), null, r.status);
          else callback(null, d, r.status);
        });
      })
      .catch(function (e) { callback(e, null, 0); });
  }

  // Non-guest roles (admin/manager/waiter) get 403 from the guest-only endpoints
  var accessDenied = false;

  function showAccessDenied() {
    if (accessDenied) return;
    accessDenied = true;
    var layout = document.getElementById('profileLayout');
    var denied = document.getElementById('accessDenied');
    if (layout) layout.classList.add('hidden');
    if (denied) denied.classList.remove('hidden');
  }

  // Check session — redirect if not logged in
  apiCall('session.php', 'GET', null, function (err, data) {
    if (err || !data || !data.success) {
      window.location.href = './index.html';
      return;
    }
    var role = data.user && data.user.role ? data.user.role : 'user';
    if (role !== 'user') {
      showAccessDenied();
      return;
    }
    loadProfile();
    loadReservations();
  });

  // Account Security (password change) is guest-only server-side; hide the
  // tab for admins/managers/waiters who land here via a stale link.
  var securityItem = document.querySelector('.sidebar-item[data-tab="security"]');
  if (securityItem) {
    fetch('../api/session.php', { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.success && data.user && data.user.role && data.user.role !== 'user') {
          securityItem.style.display = 'none';
        }
      })
      .catch(function () { /* leave tab visible; API still guards */ });
  }

  // Sidebar tabs
  var sidebarItems = document.querySelectorAll('.sidebar-item');
  var tabs = document.querySelectorAll('.tab-content');

  sidebarItems.forEach(function (item) {
    item.addEventListener('click', function () {
      var tabId = this.getAttribute('data-tab');
      sidebarItems.forEach(function (s) { s.classList.remove('active'); });
      this.classList.add('active');
      tabs.forEach(function (t) {
        t.classList.add('hidden');
        t.style.display = 'none';
      });
      var target = document.getElementById('tab-' + tabId);
      target.classList.remove('hidden');
      target.style.display = 'block';
      if (tabId === 'reservations') loadReservations();
    });
  });

  // Load profile data
  function loadProfile() {
    apiCall('profile.php', 'GET', null, function (err, data, status) {
      if (status === 403) {
        showAccessDenied();
        return;
      }
      if (err || !data || !data.success) {
        showToast('Failed to load profile.', 'error');
        return;
      }
      var u = data.user;
      document.getElementById('viewFirstName').textContent = u.first_name || '—';
      document.getElementById('viewLastName').textContent = u.last_name || '—';
      document.getElementById('viewEmail').textContent = u.email || '—';
      document.getElementById('viewPhone').textContent = u.phone || '—';
      document.getElementById('viewLocation').textContent = u.location || '—';
    });
  }

  // Edit mode
  var editBtn = document.getElementById('editProfileBtn');
  var viewMode = document.getElementById('profileViewMode');
  var editMode = document.getElementById('profileEditMode');

  editBtn.addEventListener('click', function () {
    document.getElementById('editFirstName').value = document.getElementById('viewFirstName').textContent === '—' ? '' : document.getElementById('viewFirstName').textContent;
    document.getElementById('editLastName').value = document.getElementById('viewLastName').textContent === '—' ? '' : document.getElementById('viewLastName').textContent;
    document.getElementById('editEmailDisplay').textContent = document.getElementById('viewEmail').textContent;
    document.getElementById('editPhone').value = document.getElementById('viewPhone').textContent === '—' ? '' : document.getElementById('viewPhone').textContent;
    document.getElementById('editLocation').value = document.getElementById('viewLocation').textContent === '—' ? '' : document.getElementById('viewLocation').textContent;
    viewMode.style.display = 'none';
    editMode.style.display = 'block';
    editBtn.style.display = 'none';
  });

  document.getElementById('cancelEditBtn').addEventListener('click', function () {
    editMode.style.display = 'none';
    viewMode.style.display = 'block';
    editBtn.style.display = 'flex';
  });

  document.getElementById('saveProfileBtn').addEventListener('click', function () {
    var firstName = document.getElementById('editFirstName').value.trim();
    var lastName = document.getElementById('editLastName').value.trim();
    var phone = document.getElementById('editPhone').value.trim();
    var location = document.getElementById('editLocation').value.trim();

    if (!firstName) {
      showToast('First name is required.', 'error');
      return;
    }

    apiCall('profile.php', 'POST', {
      first_name: firstName,
      last_name: lastName,
      phone: phone,
      location: location
    }, function (err, data, status) {
      if (status === 403) {
        showAccessDenied();
        return;
      }
      if (err || !data || !data.success) {
        showToast((data && data.message) || 'Error saving profile.', 'error');
        return;
      }
      showToast('Profile updated!', 'success');
      var u = data.user;
      document.getElementById('viewFirstName').textContent = u.first_name || '—';
      document.getElementById('viewLastName').textContent = u.last_name || '—';
      document.getElementById('viewEmail').textContent = u.email || '—';
      document.getElementById('viewPhone').textContent = u.phone || '—';
      document.getElementById('viewLocation').textContent = u.location || '—';
      editMode.style.display = 'none';
      viewMode.style.display = 'block';
      editBtn.style.display = 'flex';
    });
  });

  // Change password
  var passwordError = document.getElementById('passwordError');

  function setPasswordError(msg) {
    if (!passwordError) return;
    if (msg) {
      passwordError.textContent = msg;
      passwordError.classList.remove('hidden');
    } else {
      passwordError.textContent = '';
      passwordError.classList.add('hidden');
    }
  }

  document.getElementById('changePasswordBtn').addEventListener('click', function () {
    var current = document.getElementById('currentPassword').value;
    var newPwd = document.getElementById('newPassword').value;
    var confirmPwd = document.getElementById('confirmNewPassword').value;

    if (!current || !newPwd || !confirmPwd) {
      showToast('Please fill in all password fields.', 'error');
      return;
    }
    if (newPwd.length < 8) {
      showToast('New password must be at least 8 characters.', 'error');
      return;
    }
    if (newPwd !== confirmPwd) {
      showToast('New passwords do not match.', 'error');
      return;
    }

    setPasswordError('');

    apiCall('change_password.php', 'POST', {
      current_password: current,
      new_password: newPwd
    }, function (err, data, status) {
      if (status === 403) {
        showAccessDenied();
        return;
      }
      if (err || !data || !data.success) {
        var msg = (data && data.message) || 'Error changing password.';
        // Keep the "current password is incorrect" message visible inline, not just in the toast
        if (msg.indexOf('Current password is incorrect') !== -1) {
          setPasswordError(msg);
        }
        showToast(msg, 'error');
        return;
      }
      setPasswordError('');
      showToast('Password changed successfully!', 'success');
      document.getElementById('currentPassword').value = '';
      document.getElementById('newPassword').value = '';
      document.getElementById('confirmNewPassword').value = '';
    });
  });

  // ===== RESERVATIONS =====
  function loadReservations() {
    if (accessDenied) return;
    var container = document.getElementById('reservationsList');
    container.innerHTML = '<p class="font-inter text-[#999] text-base">Loading...</p>';

    apiCall('reservations.php', 'GET', null, function (err, data, status) {
      if (status === 403) {
        showAccessDenied();
        return;
      }
      if (err || !data || !data.success) {
        container.innerHTML = '<p class="font-inter text-[#999] text-base">Failed to load reservations.</p>';
        return;
      }

      var reservations = data.reservations;
      if (!reservations || reservations.length === 0) {
        container.innerHTML = '<p class="font-inter text-[#999] text-base">No reservations yet. <a href="./index.html" style="color:#1e2e37;font-weight:500;">Explore hotels</a></p>';
        return;
      }

      var html = '';
      reservations.forEach(function (r) {
        var statusColor = {
          pending: '#f59e0b',
          approved: '#3b82f6',
          paid: '#10b981',
          cancelled: '#ef4444'
        };
        var statusLabel = {
          pending: 'Pending',
          approved: 'Ready to Pay',
          paid: 'Booked',
          cancelled: 'Cancelled'
        };
        var color = statusColor[r.status] || '#999';
        var label = statusLabel[r.status] || r.status;
        var date = new Date(r.created_at);
        var dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        var extras = [];
        try {
          extras = JSON.parse(r.services || '[]');
          if (!Array.isArray(extras)) extras = [];
        } catch (_e) {
          extras = [];
        }
        var roomTypeLabel = '';
        var extraServices = [];
        extras.forEach(function (item) {
          if (typeof item !== 'string') return;
          if (item.indexOf('Room type: ') === 0) {
            roomTypeLabel = item.replace('Room type: ', '');
          } else {
            extraServices.push(formatServiceLabel(item));
          }
        });

        html += '<div class="reservation-card" style="background:white;border-radius:16px;padding:24px 28px;border:1px solid #e5e5e5;display:flex;align-items:center;justify-content:space-between;gap:20px;">';
        html += '<div style="flex:1;">';
        html += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">';
        html += '<h3 style="font-family:ABeeZee,sans-serif;font-size:18px;margin:0;color:#000;">' + r.hotel_name + '</h3>';
        html += '<span style="font-size:12px;font-weight:500;padding:4px 12px;border-radius:20px;background:' + color + '18;color:' + color + ';font-family:Inter,sans-serif;">' + label + '</span>';
        html += '</div>';
        html += '<div style="font-family:Inter,sans-serif;font-size:14px;color:#666;display:flex;gap:20px;flex-wrap:wrap;">';
        html += '<span>' + r.check_in + ' → ' + r.check_out + '</span>';
        html += '<span>' + r.nights + ' night(s)</span>';
        html += '<span>' + r.rooms_count + ' room(s), ' + r.guests + ' guest(s)</span>';
        html += '</div>';
        if (roomTypeLabel || extraServices.length) {
          html += '<div style="font-family:Inter,sans-serif;font-size:13px;color:#7a7a7a;display:flex;gap:16px;flex-wrap:wrap;margin-top:8px;">';
          if (roomTypeLabel) {
            html += '<span><strong style="color:#1e2e37;font-weight:600;">Room type:</strong> ' + roomTypeLabel + '</span>';
          }
          if (extraServices.length) {
            html += '<span><strong style="color:#1e2e37;font-weight:600;">Services:</strong> ' + extraServices.join(', ') + '</span>';
          }
          html += '</div>';
        }
        if (r.admin_note) {
          html += '<p style="font-family:Inter,sans-serif;font-size:13px;color:#3b82f6;margin:8px 0 0;"><strong>Update:</strong> ' + r.admin_note + '</p>';
        }
        html += '</div>';
        html += '<div style="text-align:right;shrink:0;">';
        html += '<div style="font-family:Inter,sans-serif;font-weight:600;font-size:22px;color:#000;">$' + parseFloat(r.total_price).toFixed(0) + '</div>';
        html += '<div style="font-family:Inter,sans-serif;font-size:12px;color:#999;">' + dateStr + '</div>';

        // Show Pay button when admin approved
        if (r.status === 'approved') {
          html += '<button onclick="payReservation(' + r.id + ', this)" style="margin-top:10px;padding:8px 24px;border-radius:10px;border:none;color:white;font-family:Inter,sans-serif;font-weight:500;font-size:13px;cursor:pointer;background:linear-gradient(119deg,#3f3f3f 18%,#151515 77%);box-shadow:inset 0 4px 12px #081738;">Pay Now</button>';
        }

        html += '</div></div>';
      });

      container.innerHTML = html;
    });
  }

  function formatServiceLabel(value) {
    return String(value || '')
      .split('_')
      .map(function (part) {
        return part ? part.charAt(0).toUpperCase() + part.slice(1) : '';
      })
      .join(' ');
  }

  // Pay for reservation (global function for onclick)
  window.payReservation = function (reservationId, btn) {
    rfModal.confirm({
      title: 'Confirm Payment',
      message: 'You are about to complete the payment for this reservation. This action cannot be undone.',
      confirmText: 'Pay Now',
      cancelText: 'Not Yet',
      onConfirm: function () {
        btn.disabled = true;
        btn.textContent = 'Processing...';

        fetch(API_BASE + '/pay.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ reservation_id: reservationId })
        })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            // Stripe gateway: the API hands back a hosted-checkout URL.
            if (d.success && d.checkout_url) {
              window.location.href = d.checkout_url;
              return;
            }
            if (d.success) {
              rfModal.success({
                title: 'Payment Successful!',
                message: 'Your room has been booked. We look forward to welcoming you!',
                btnText: 'Great',
                onClose: function () { loadReservations(); }
              });
            } else {
              rfModal.error({
                title: 'Payment Failed',
                message: d.message || 'Something went wrong. Please try again.'
              });
              btn.disabled = false;
              btn.textContent = 'Pay Now';
            }
          })
          .catch(function () {
            rfModal.error({
              title: 'Connection Error',
              message: 'Could not reach the server. Please check your connection and try again.'
            });
            btn.disabled = false;
            btn.textContent = 'Pay Now';
          });
      }
    });
  };

  // ===== Stripe return handling =====
  // Comes back to profile.html?payment=success&session_id=cs_... (or ?payment=cancelled).
  (function handlePaymentReturn() {
    var params = new URLSearchParams(window.location.search);
    var payment = params.get('payment');
    if (!payment) return;

    // Clean the URL first so a refresh doesn't re-confirm the payment.
    window.history.replaceState({}, '', window.location.pathname);

    if (payment === 'cancelled') {
      rfModal.error({
        title: 'Payment Cancelled',
        message: 'No charge was made. You can pay for the reservation any time from this page.'
      });
      loadReservations();
      return;
    }

    if (payment !== 'success') return;

    var sessionId = params.get('session_id') || '';
    fetch(API_BASE + '/payment_confirm.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ session_id: sessionId })
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.success) {
          rfModal.success({
            title: 'Payment Successful!',
            message: 'Your payment was verified and your room is booked. We look forward to welcoming you!'
                + (d.loyalty_points_awarded ? ' You earned ' + d.loyalty_points_awarded + ' loyalty points!' : ''),
            btnText: 'Great',
            onClose: function () { loadReservations(); }
          });
        } else {
          rfModal.error({
            title: 'Payment Verification Failed',
            message: d.message || 'We could not verify this payment. Please contact support before retrying.'
          });
          loadReservations();
        }
      })
      .catch(function () {
        rfModal.error({
          title: 'Connection Error',
          message: 'Could not verify the payment. Please refresh the page — if the status did not update, contact support.'
        });
      });
  })();

})();
