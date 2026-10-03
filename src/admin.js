// ===== Admin Dashboard =====
(function () {
  var API_BASE = '../api';
  var currentFilter = 'all';
  var allReservations = [];
  var revenueChartInstance = null;
  var statusChartInstance = null;
  var occupancyChartInstance = null;
  var TOTAL_ROOMS = 24; // fallback; replaced by the real inventory total from stats
  var allHotels = [];
  var globalStatusBreakdown = {};

  // Design-system avatar colors (no red/blue/green/yellow)
  var avatarColors = ['#1e2e37', '#3a5a6a', '#5bb5a2', '#3d8b6e', '#4a7a8c', '#2c4450'];

  // ===== AUTH CHECK =====
  fetch(API_BASE + '/session.php', { credentials: 'include' })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data.success || !data.user || data.user.role !== 'admin') {
        alert('Access denied. Admin only.');
        window.location.href = './index.html';
        return;
      }
      var user = data.user;
      document.getElementById('adminGreeting').textContent = 'Welcome back, ' + user.name;
      document.getElementById('adminAvatar').textContent = user.name.charAt(0).toUpperCase();
      loadDashboard();
    })
    .catch(function () {
      window.location.href = './index.html';
    });

  // ===== DATE =====
  var now = new Date();
  document.getElementById('todayDate').textContent = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  // ===== SIDEBAR NAVIGATION =====
  var navItems = document.querySelectorAll('.admin-nav-item[data-section]');
  navItems.forEach(function (item) {
    item.addEventListener('click', function () {
      switchSection(this.getAttribute('data-section'));
    });
  });

  window.switchSection = function (section) {
    navItems.forEach(function (n) { n.classList.remove('active'); });
    var navItem = document.querySelector('.admin-nav-item[data-section="' + section + '"]');
    if (navItem) navItem.classList.add('active');

    document.querySelectorAll('.admin-section').forEach(function (s) { s.classList.remove('active'); });
    var sectionEl = document.getElementById('section-' + section);
    if (sectionEl) sectionEl.classList.add('active');

    if (section === 'users') loadUsers();
    if (section === 'bookings') loadBookings();
    if (section === 'employees') loadEmployees();
    if (section === 'support') loadSupport();
    if (section === 'hotels') loadHotelsAdmin();
  };

  // ===== BACK / LOGOUT =====
  document.getElementById('backToSite').addEventListener('click', function () {
    window.location.href = './index.html';
  });
  document.getElementById('adminLogout').addEventListener('click', function () {
    fetch(API_BASE + '/logout.php', { method: 'POST', credentials: 'include' })
      .then(function () { window.location.href = './index.html'; })
      .catch(function () { window.location.href = './index.html'; });
  });

  // ===== NOTIFICATION BELL =====
  var notifBtn = document.getElementById('notifBtn');
  var notifDropdown = document.getElementById('notifDropdown');
  notifBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    notifDropdown.classList.toggle('open');
    // Hide dot when opened
    if (notifDropdown.classList.contains('open')) {
      document.getElementById('notifDot').style.display = 'none';
    }
  });
  document.addEventListener('click', function (e) {
    if (!notifDropdown.contains(e.target) && e.target !== notifBtn) {
      notifDropdown.classList.remove('open');
    }
  });

  // ===== LOAD DASHBOARD =====
  function loadDashboard() {
    fetch(API_BASE + '/admin.php?action=stats', { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.success) return;
        var s = data.stats;

        // Keep the raw stats reachable for the hotel-filter "all" branch
        window.__adminStats = s;

        // The "All Hotels" inventory is the sum of every hotel's rooms
        if (s.total_rooms_all && s.total_rooms_all > 0) {
          TOTAL_ROOMS = s.total_rooms_all;
        }

        var statusBreakdown = {};
        if (s.by_status && Array.isArray(s.by_status)) {
          s.by_status.forEach(function (item) {
            statusBreakdown[item.status] = parseInt(item.count) || 0;
          });
        }

        var bookedCount = statusBreakdown.paid || 0;
        var pendingCount = s.pending_count || statusBreakdown.pending || 0;
        var cancelledCount = statusBreakdown.cancelled || 0;

        // Summary cards (2x2 grid)
        document.getElementById('statBooked').textContent = bookedCount;
        document.getElementById('statPending').textContent = pendingCount;
        document.getElementById('statCancelled').textContent = cancelledCount;

        // Revenue
        var totalRev = s.total_revenue || 0;
        document.getElementById('statRevenue').textContent = '$' + formatNumber(totalRev);

        // Pending badge in nav
        var badge = document.getElementById('navPendingBadge');
        if (pendingCount > 0) {
          badge.textContent = pendingCount;
          badge.style.display = 'inline';
        }

        // Store global stats for "All Hotels" view
        globalStatusBreakdown = statusBreakdown;

        // Charts
        renderRevenueChart(s.revenue_by_day || []);

        // Room grid + occupancy ring use date-aware occupancy from the API
        // (active stays overlapping today), not the raw paid-booking count.
        var occupiedNow = Math.min(s.occupied_now || 0, TOTAL_ROOMS);
        var pendingNow = Math.min(pendingCount, Math.max(0, TOTAL_ROOMS - occupiedNow));
        renderRoomGrid(occupiedNow, pendingNow, TOTAL_ROOMS);
        renderOccupancyChart(occupiedNow, TOTAL_ROOMS, statusBreakdown, pendingNow);
      })
      .catch(function () {
        alert('Could not load dashboard stats. Please refresh the page.');
      });

    // Load ALL reservations (used for recent bookings + per-hotel filtering)
    fetch(API_BASE + '/admin.php?action=reservations', { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.success) return;
        allReservations = data.reservations;
        renderRecentBookings(data.reservations.slice(0, 6));
        renderActivityFeed(data.reservations.slice(0, 8));
      })
      .catch(function () {
        console.error('Failed to load reservations feed.');
      });
  }

  // ===== FORMAT NUMBERS =====
  function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(num >= 10000 ? 0 : 1) + 'K';
    return num.toLocaleString();
  }

  // ===== REVENUE CHART =====
  function renderRevenueChart(revenueData) {
    var canvas = document.getElementById('revenueChart');
    if (revenueChartInstance) revenueChartInstance.destroy();

    var labels = [];
    var values = [];

    if (revenueData.length > 0) {
      // Group by month for monthly display
      var monthMap = {};
      revenueData.forEach(function (d) {
        var dt = new Date(d.day || d.date);
        var key = dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (!monthMap[key]) monthMap[key] = 0;
        monthMap[key] += parseFloat(d.revenue);
      });
      Object.keys(monthMap).forEach(function (k) {
        labels.push(k);
        values.push(monthMap[k]);
      });
    }

    // Fallback: show last 6 months with $0
    if (labels.length === 0) {
      for (var i = 5; i >= 0; i--) {
        var d = new Date();
        d.setMonth(d.getMonth() - i);
        labels.push(d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
        values.push(0);
      }
    }

    // Generate a simulated expenses line (30-60% of income) for visual effect
    var expenses = values.map(function (v) {
      return Math.round(v * (0.3 + Math.random() * 0.3));
    });

    // Crosshair vertical line plugin
    var crosshairPlugin = {
      id: 'revenueCrosshair',
      afterDraw: function (chart) {
        var activeElements = chart.getActiveElements();
        if (!activeElements || activeElements.length === 0) return;
        var ctx = chart.ctx;
        var area = chart.chartArea;
        var meta = chart.getDatasetMeta(activeElements[0].datasetIndex);
        var point = meta.data[activeElements[0].index];
        if (!point) return;
        var x = point.x;

        ctx.save();
        // Dashed vertical line
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.moveTo(x, area.top);
        ctx.lineTo(x, area.bottom);
        ctx.stroke();
        ctx.restore();

        // Draw highlighted dot
        var px = point.x;
        var py = point.y;

        ctx.save();
        // Outer glow
        ctx.beginPath();
        ctx.arc(px, py, 10, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(232,149,109,0.15)';
        ctx.fill();
        // Inner white ring
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        // Colored center dot
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#e8956d';
        ctx.fill();

        // Value label above the dot in a white rounded card
        var value = chart.data.datasets[0].data[activeElements[0].index];
        var label = '$' + value.toLocaleString();
        var monthLabel = chart.data.labels[activeElements[0].index];

        ctx.font = '700 14px Inter, sans-serif';
        var valWidth = ctx.measureText(label).width;
        ctx.font = '400 11px Inter, sans-serif';
        var monthWidth = ctx.measureText(monthLabel).width;
        var boxW = Math.max(valWidth, monthWidth) + 28;
        var boxH = 48;
        var boxX = px - boxW / 2;
        var boxY = py - 22 - boxH;

        // Clamp to chart area
        if (boxX < area.left) boxX = area.left + 2;
        if (boxX + boxW > area.right) boxX = area.right - boxW - 2;
        if (boxY < area.top) boxY = py + 18;

        // Shadow
        ctx.shadowColor = 'rgba(0,0,0,0.08)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 4;

        // White rounded rect
        var r = 10;
        ctx.beginPath();
        ctx.moveTo(boxX + r, boxY);
        ctx.lineTo(boxX + boxW - r, boxY);
        ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + r);
        ctx.lineTo(boxX + boxW, boxY + boxH - r);
        ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - r, boxY + boxH);
        ctx.lineTo(boxX + r, boxY + boxH);
        ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - r);
        ctx.lineTo(boxX, boxY + r);
        ctx.quadraticCurveTo(boxX, boxY, boxX + r, boxY);
        ctx.closePath();
        ctx.fillStyle = '#fff';
        ctx.fill();

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Border
        ctx.strokeStyle = '#f0f0f0';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Value text
        ctx.font = '700 14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#1e2e37';
        ctx.fillText(label, boxX + boxW / 2, boxY + 22);

        // Month text
        ctx.font = '400 11px Inter, sans-serif';
        ctx.fillStyle = '#999';
        ctx.fillText(monthLabel, boxX + boxW / 2, boxY + 38);

        ctx.restore();
      }
    };

    revenueChartInstance = new Chart(canvas, {
      type: 'line',
      plugins: [crosshairPlugin],
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Income',
            data: values,
            borderColor: '#e8956d',
            backgroundColor: function (context) {
              var chart = context.chart;
              var ctx = chart.ctx;
              var area = chart.chartArea;
              if (!area) return 'rgba(232,149,109,0.05)';
              var gradient = ctx.createLinearGradient(0, area.top, 0, area.bottom);
              gradient.addColorStop(0, 'rgba(232,149,109,0.18)');
              gradient.addColorStop(0.7, 'rgba(232,149,109,0.03)');
              gradient.addColorStop(1, 'rgba(232,149,109,0)');
              return gradient;
            },
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 0,
            borderWidth: 2.5,
            order: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
            border: { display: false },
            ticks: {
              font: { family: 'Inter', size: 11 }, color: '#bbb', padding: 8,
              callback: function (v) {
                if (v === 0) return '0';
                if (v >= 1000000) return (v / 1000000).toFixed(0) + ',00k';
                if (v >= 1000) return (v / 1000).toFixed(0) + 'k';
                return v;
              }
            }
          },
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { font: { family: 'Inter', size: 11 }, color: '#bbb', padding: 8 }
          }
        }
      }
    });
  }

  // ===== OCCUPANCY CHART (based on date-aware occupied rooms) =====
  function renderOccupancyChart(occupied, total, breakdown, pendingNow) {
    var canvas = document.getElementById('occupancyChart');
    if (occupancyChartInstance) occupancyChartInstance.destroy();

    var percentage = total > 0 ? Math.round((occupied / total) * 100) : 0;
    document.getElementById('occupancyPct').textContent = percentage + '%';
    document.getElementById('occupancySub').textContent = occupied + ' / ' + total + ' rooms';

    occupancyChartInstance = new Chart(canvas, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [occupied, total - occupied],
          backgroundColor: ['#1e2e37', '#eaeaea'],
          borderWidth: 0,
          borderRadius: occupied > 0 && occupied < total ? 6 : 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '78%',
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        animation: { animateRotate: true, duration: 1200 }
      }
    });

    // Render booking breakdown legend below occupancy ring
    if (breakdown) {
      var statusData = [
        { label: 'Occupied now', value: occupied, color: '#1e2e37' },
        { label: 'Pending', value: (typeof pendingNow === 'number' ? pendingNow : (breakdown.pending || 0)), color: '#5bb5a2' },
        { label: 'Approved (upcoming)', value: breakdown.approved || 0, color: '#3a5a6a' },
        { label: 'Cancelled', value: breakdown.cancelled || 0, color: '#8b5e5e' }
      ];
      var legendEl = document.getElementById('statusLegend');
      var legendTotal = statusData.reduce(function (a, b) { return a + b.value; }, 0) || 1;
      legendEl.innerHTML = statusData.map(function (s) {
        var pct = Math.round((s.value / legendTotal) * 100);
        return '<div style="display:flex;align-items:center;gap:10px;padding:6px 0;">' +
          '<span style="width:10px;height:10px;border-radius:3px;background:' + s.color + ';flex-shrink:0;"></span>' +
          '<span style="flex:1;font-family:Inter,sans-serif;font-size:12px;color:#666;">' + s.label + '</span>' +
          '<span style="font-family:Inter,sans-serif;font-size:13px;font-weight:600;color:#1e2e37;">' + s.value + '</span>' +
          '<span style="font-family:Inter,sans-serif;font-size:11px;color:#aaa;min-width:32px;text-align:right;">' + pct + '%</span>' +
          '</div>';
      }).join('');
    }
  }

  // ===== ROOM STATUS GRID (occupied → pending → available, serial) =====
  function renderRoomGrid(occupied, pending, totalRooms) {
    var grid = document.getElementById('roomGrid');
    var total = totalRooms || TOTAL_ROOMS;
    var bookedCount = Math.min(occupied || 0, total);
    var remaining = total - bookedCount;
    var pendingCount = Math.min(pending || 0, remaining);

    var cells = [];
    for (var i = 0; i < total; i++) {
      if (i < bookedCount) cells.push('booked');
      else if (i < bookedCount + pendingCount) cells.push('pending');
      else cells.push('available');
    }

    grid.innerHTML = cells.map(function (type, idx) {
      var num = String(idx + 1).padStart(2, '0');
      return '<div class="room-cell room-' + type + '">' + num + '</div>';
    }).join('');
  }

  // ===== HOTEL FILTER (exposed globally for inline onchange) =====
  window.handleHotelFilter = function (hotelId) {
    if (hotelId === 'all') {
      // Recompute from the stored global stats
      if (window.__adminStats) {
        var s = window.__adminStats;
        var occupiedNow = Math.min(s.occupied_now || 0, TOTAL_ROOMS);
        var pendingNow = Math.min(s.pending_count || 0, Math.max(0, TOTAL_ROOMS - occupiedNow));
        renderRoomGrid(occupiedNow, pendingNow, TOTAL_ROOMS);
        renderOccupancyChart(occupiedNow, TOTAL_ROOMS, globalStatusBreakdown, pendingNow);
      }
      return;
    }

    fetch(API_BASE + '/admin.php?action=hotel_stats&hotel_id=' + encodeURIComponent(hotelId), { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.success) return;

        var statusBreakdown = {};
        if (data.by_status && Array.isArray(data.by_status)) {
          data.by_status.forEach(function (item) {
            statusBreakdown[item.status] = parseInt(item.count) || 0;
          });
        }

        var totalRooms = data.total_rooms || TOTAL_ROOMS;
        var occupied = Math.min(data.occupied_now || 0, totalRooms);
        var pendingCount = Math.min(statusBreakdown.pending || 0, Math.max(0, totalRooms - occupied));
        renderRoomGrid(occupied, pendingCount, totalRooms);
        renderOccupancyChart(occupied, totalRooms, statusBreakdown, pendingCount);
      })
      .catch(function (err) {
        console.error('[HotelFilter] Fetch error:', err);
        alert('Could not load hotel stats. Please try again.');
      });
  };

  // ===== RECENTLY BOOKED TABLE =====
  function renderRecentBookings(reservations) {
    var tbody = document.getElementById('recentBookingsBody');
    if (!reservations || reservations.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#999;padding:40px;font-family:Inter,sans-serif;font-size:13px;">No bookings yet</td></tr>';
      return;
    }

    var html = '';
    reservations.forEach(function (r) {
      var initial = (r.user_name || 'U').charAt(0).toUpperCase();
      var color = avatarColors[initial.charCodeAt(0) % avatarColors.length];
      html += '<tr>';
      html += '<td style="padding-left:24px;"><div style="display:flex;align-items:center;gap:10px;">';
      html += '<div class="user-avatar" style="background:' + color + ';">' + initial + '</div>';
      html += '<div><div style="font-weight:600;font-size:13px;">' + escapeHtml(r.user_name || 'Unknown') + '</div>';
      html += '<div style="font-size:11px;color:#aaa;">' + escapeHtml(r.user_email || '') + '</div></div></div></td>';
      html += '<td style="font-size:12px;color:#666;">' + escapeHtml(r.hotel_name) + '</td>';
      html += '<td style="font-size:12px;color:#666;">' + (r.guests || 1) + '</td>';
      html += '<td style="font-size:12px;color:#666;">' + formatDate(r.check_in) + '<div style="font-size:11px;color:#9a9a9a;line-height:1.35;">Booked ' + formatTime(r.created_at) + '</div></td>';
      html += '<td style="font-size:12px;color:#666;">' + formatDate(r.check_out) + '<div style="font-size:11px;color:#9a9a9a;line-height:1.35;">Booked ' + formatTime(r.created_at) + '</div></td>';
      html += '<td style="padding-right:24px;"><span class="status-badge status-' + r.status + '">' + capitalizeStatus(r.status) + '</span></td>';
      html += '</tr>';
    });
    tbody.innerHTML = html;
  }

  // ===== ACTIVITY FEED (in notification dropdown) =====
  function renderActivityFeed(reservations) {
    var feed = document.getElementById('activityFeed');
    var notifCountEl = document.getElementById('notifCount');
    var notifDot = document.getElementById('notifDot');

    if (!reservations || reservations.length === 0) {
      feed.innerHTML = '<div style="text-align:center;color:#999;padding:30px 20px;font-family:Inter,sans-serif;font-size:13px;">No recent activity</div>';
      notifCountEl.textContent = '0';
      return;
    }

    // Show notification dot and count
    notifCountEl.textContent = reservations.length;
    notifDot.style.display = 'block';

    // Design-system activity icons
    var icons = {
      paid: { bg: '#e6f4ef', color: '#3d8b6e', icon: '<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>' },
      pending: { bg: '#eaeaea', color: '#666', icon: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>' },
      approved: { bg: '#e8f0f3', color: '#3a5a6a', icon: '<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>' },
      cancelled: { bg: '#f0eaea', color: '#8b5e5e', icon: '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>' }
    };

    var actions = {
      paid: 'booked',
      pending: 'requested a booking at',
      approved: 'booking approved for',
      cancelled: 'booking cancelled at'
    };

    var html = '';
    reservations.forEach(function (r) {
      var s = r.status || 'pending';
      var ic = icons[s] || icons.pending;
      var action = actions[s] || 'updated';
      var timeAgo = getTimeAgo(r.created_at);

      html += '<div class="activity-item">';
      html += '<div class="activity-dot" style="background:' + ic.bg + ';"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="' + ic.color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ic.icon + '</svg></div>';
      html += '<div style="flex:1;">';
      html += '<div class="activity-text"><strong>' + escapeHtml(r.user_name || 'Guest') + '</strong> ' + action + ' <strong>' + escapeHtml(r.hotel_name) + '</strong></div>';
      html += '<div class="activity-time">' + timeAgo + '</div>';
      html += '</div></div>';
    });
    feed.innerHTML = html;
  }

  // ===== ALL BOOKINGS =====
  function loadBookings() {
    var statusParam = currentFilter !== 'all' ? '&status=' + currentFilter : '';
    fetch(API_BASE + '/admin.php?action=reservations' + statusParam, { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.success) return;
        allReservations = data.reservations;
        renderAllBookings(data.reservations);
      })
      .catch(function () {
        alert('Could not load bookings. Please try again.');
      });
  }

  function renderAllBookings(reservations) {
    var tbody = document.getElementById('allBookingsBody');
    if (!reservations || reservations.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#999;padding:40px;font-family:Inter,sans-serif;font-size:13px;">No bookings found</td></tr>';
      return;
    }

    var html = '';
    reservations.forEach(function (r) {
      var initial = (r.user_name || 'U').charAt(0).toUpperCase();
      var color = avatarColors[initial.charCodeAt(0) % avatarColors.length];
      html += '<tr>';
      html += '<td style="padding-left:24px;"><div style="display:flex;align-items:center;gap:10px;">';
      html += '<div class="user-avatar" style="background:' + color + ';">' + initial + '</div>';
      html += '<div><div style="font-weight:600;font-size:13px;">' + escapeHtml(r.user_name || 'Unknown') + '</div>';
      html += '<div style="font-size:11px;color:#aaa;">' + escapeHtml(r.user_email || '') + '</div></div></div></td>';
      html += '<td>' + escapeHtml(r.hotel_name) + '</td>';
      html += '<td style="font-size:12px;color:#666;">' + formatDate(r.check_in) + '<div style="font-size:11px;color:#9a9a9a;line-height:1.35;">Booked ' + formatTime(r.created_at) + '</div></td>';
      html += '<td style="font-size:12px;color:#666;">' + formatDate(r.check_out) + '<div style="font-size:11px;color:#9a9a9a;line-height:1.35;">Booked ' + formatTime(r.created_at) + '</div></td>';
      html += '<td>' + r.rooms_count + '</td>';
      html += '<td>' + r.guests + '</td>';
      html += '<td style="font-weight:700;">$' + parseFloat(r.total_price).toFixed(0) + '</td>';
      html += '<td><span class="status-badge status-' + r.status + '">' + capitalizeStatus(r.status) + '</span></td>';
      html += '<td style="white-space:nowrap;padding-right:24px;">';

      if (r.status === 'pending') {
        html += '<button class="action-btn approve" onclick="updateReservation(' + r.id + ', \'approved\')">Approve</button> ';
        html += '<button class="action-btn cancel" onclick="updateReservation(' + r.id + ', \'cancelled\')">Cancel</button>';
      } else if (r.status === 'approved') {
        html += '<button class="action-btn cancel" onclick="updateReservation(' + r.id + ', \'cancelled\')">Cancel</button>';
      } else {
        html += '<span style="color:#ccc;font-size:12px;">—</span>';
      }

      html += '</td></tr>';
    });
    tbody.innerHTML = html;
  }

  // ===== BOOKING FILTERS =====
  document.getElementById('bookingFilters').addEventListener('click', function (e) {
    var btn = e.target.closest('.filter-btn');
    if (!btn) return;
    currentFilter = btn.getAttribute('data-filter');
    this.querySelectorAll('.filter-btn').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    loadBookings();
  });

  // ===== UPDATE RESERVATION STATUS =====
  window.updateReservation = function (id, status) {
    var isApprove = status === 'approved';
    var actionLabel = isApprove ? 'approve' : 'cancel';

    rfModal.confirm({
      title: isApprove ? 'Approve Reservation' : 'Cancel Reservation',
      message: isApprove
        ? 'This will approve the reservation and notify the guest to complete payment.'
        : 'This will cancel the reservation. The guest will be notified about the cancellation.',
      confirmText: isApprove ? 'Approve' : 'Cancel Booking',
      cancelText: 'Go Back',
      danger: !isApprove,
      onConfirm: function () {
        rfModal.prompt({
          title: 'Add a Note',
          message: 'Optionally add a note for the guest regarding this ' + actionLabel + '.',
          placeholder: 'e.g. Your room is confirmed for the requested dates',
          confirmText: 'Submit',
          cancelText: 'Skip',
          onSubmit: function (note) { performUpdate(id, status, actionLabel, note); },
          onCancel: function () { performUpdate(id, status, actionLabel, ''); }
        });
      }
    });
  };

  function performUpdate(id, status, actionLabel, note) {
    fetch(API_BASE + '/admin.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        action: 'update_status',
        reservation_id: id,
        status: status,
        admin_note: note
      })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.success) {
          rfModal.success({
            title: 'Reservation ' + actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1) + 'd',
            message: 'The reservation has been ' + actionLabel + 'd successfully. The guest will be notified.',
            btnText: 'Done',
            onClose: function () {
              loadBookings();
              loadDashboard();
            }
          });
        } else {
          rfModal.error({
            title: 'Update Failed',
            message: data.message || 'Could not update the reservation. Please try again.'
          });
        }
      })
      .catch(function () {
        rfModal.error({
          title: 'Connection Error',
          message: 'Could not reach the server. Please check your connection and try again.'
        });
      });
  }

  // ===== USERS =====
  function loadUsers() {
    fetch(API_BASE + '/admin.php?action=users', { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.success) return;
        renderUsers(data.users);
      })
      .catch(function () {
        alert('Could not load users. Please try again.');
      });
  }

  function renderUsers(users) {
    var tbody = document.getElementById('usersBody');
    if (!users || users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#999;padding:40px;font-family:Inter,sans-serif;font-size:13px;">No users found</td></tr>';
      return;
    }

    var html = '';
    users.forEach(function (u) {
      var joined = new Date(u.created_at);
      var joinedStr = joined.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      var initial = (u.full_name || 'U').charAt(0).toUpperCase();
      var color = avatarColors[initial.charCodeAt(0) % avatarColors.length];
      html += '<tr>';
      html += '<td style="padding-left:24px;"><div style="display:flex;align-items:center;gap:10px;">';
      html += '<div class="user-avatar" style="background:' + color + ';">' + initial + '</div>';
      html += '<span style="font-weight:600;font-size:13px;">' + escapeHtml(u.full_name || 'Unknown') + '</span></div></td>';
      html += '<td style="font-size:13px;">' + escapeHtml(u.email) + '</td>';
      html += '<td><span class="status-badge ' + (u.role === 'admin' ? 'status-approved' : 'status-paid') + '">' + u.role + '</span></td>';
      html += '<td>' + (u.reservation_count || 0) + '</td>';
      html += '<td style="padding-right:24px;font-size:12px;color:#888;">' + joinedStr + '</td>';
      html += '</tr>';
    });
    tbody.innerHTML = html;
  }

  // ===== HELPERS =====
  function escapeHtml(text) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  function capitalizeStatus(status) {
    if (status === 'paid') return 'Booked';
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    var d = parseDateValue(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatTime(dateStr) {
    if (!dateStr) return '—';
    var d = parseDateValue(dateStr);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  function parseDateValue(dateStr) {
    // MySQL DATETIME strings like "2026-04-20 14:30:00" are normalized for consistent browser parsing.
    var normalized = String(dateStr).replace(' ', 'T');
    var d = new Date(normalized);
    if (!isNaN(d.getTime())) return d;

    // Fallback for DATE values (YYYY-MM-DD) to avoid invalid date rendering.
    var m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(String(dateStr));
    if (m) {
      return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
    }
    return new Date();
  }

  function getTimeAgo(dateStr) {
    if (!dateStr) return '';
    var now = new Date();
    var then = new Date(dateStr);
    var diffMs = now - then;
    var diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return diffMin + 'm ago';
    var diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return diffHr + 'h ago';
    var diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return diffDay + 'd ago';
    return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // ===== EMPLOYEES =====
  var empCurrentRole = 'all';
  var allEmployees = [];
  var hotelsForEmployees = [];

  function loadHotelsForEmployees() {
    return fetch(API_BASE + '/admin.php?action=hotels', { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        hotelsForEmployees = (data && data.success && Array.isArray(data.hotels)) ? data.hotels : [];
        var hotelSelect = document.getElementById('empHotel');
        if (!hotelSelect) return;

        var options = '<option value="">Select hotel...</option>';
        hotelsForEmployees.forEach(function (h) {
          options += '<option value="' + h.id + '">' + escapeHtml(h.name) + '</option>';
        });
        hotelSelect.innerHTML = options;
      })
      .catch(function () {
        var hotelSelect = document.getElementById('empHotel');
        if (hotelSelect) {
          hotelSelect.innerHTML = '<option value="">Failed to load hotels</option>';
        }
      });
  }

  function loadEmployees() {
    var tbody = document.getElementById('empTableBody');
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#bbb;font-size:14px;">Loading...</td></tr>';

    fetch(API_BASE + '/admin.php?action=employees', { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        allEmployees = data.employees || [];
        renderEmployees();
      })
      .catch(function () {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#e44;font-size:14px;">Failed to load employees.</td></tr>';
      });
  }

  function renderEmployees() {
    var tbody = document.getElementById('empTableBody');
    var filtered = empCurrentRole === 'all' ? allEmployees : allEmployees.filter(function (e) { return e.role === empCurrentRole; });

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#bbb;font-family:Inter,sans-serif;font-size:14px;">No employees found.</td></tr>';
      return;
    }

    var html = '';
    filtered.forEach(function (emp) {
      var initial = (emp.full_name || 'E').charAt(0).toUpperCase();
      var color = emp.role === 'manager' ? '#3d8b6e' : '#9b5a1a';
      var joined = new Date(emp.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      var isActive = parseInt(emp.is_active) === 1;

      html += '<tr>';
      html += '<td style="padding-left:20px;"><div style="display:flex;align-items:center;gap:10px;">';
      html += '<div style="width:36px;height:36px;border-radius:50%;background:' + color + ';color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;font-family:Inter,sans-serif;flex-shrink:0;">' + initial + '</div>';
      html += '<span style="font-weight:600;font-size:13px;font-family:Inter,sans-serif;">' + escapeHtml(emp.full_name) + '</span></div></td>';
      html += '<td style="font-size:13px;font-family:Inter,sans-serif;">' + escapeHtml(emp.email) + '</td>';
      html += '<td><span class="role-badge role-' + emp.role + '">';
      html += emp.role === 'manager' ? 'Manager' : 'Waiter';
      html += '</span></td>';
      html += '<td style="font-size:13px;color:#666;">' + (emp.hotel_name ? escapeHtml(emp.hotel_name) : '<span style="color:#ccc;">Not assigned</span>') + '</td>';
      html += '<td style="font-size:13px;color:#666;">' + (emp.phone ? escapeHtml(emp.phone) : '<span style="color:#ccc;">—</span>') + '</td>';
      html += '<td><span class="status-badge ' + (isActive ? 'status-paid' : 'status-cancelled') + '">' + (isActive ? 'Active' : 'Inactive') + '</span></td>';
      html += '<td style="font-size:12px;color:#888;padding-right:16px;">' + joined + '</td>';
      html += '<td style="padding-right:20px;">';
      html += '<button class="action-btn" style="margin-right:6px;" onclick="toggleEmployee(' + emp.id + ', this)">' + (isActive ? 'Deactivate' : 'Activate') + '</button>';
      html += '<button class="action-btn cancel" onclick="deleteEmployee(' + emp.id + ', this)">Remove</button>';
      html += '</td>';
      html += '</tr>';
    });
    tbody.innerHTML = html;
  }

  // Role tabs
  document.querySelectorAll('.emp-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.emp-tab').forEach(function (t) { t.classList.remove('active'); });
      this.classList.add('active');
      empCurrentRole = this.getAttribute('data-role');
      renderEmployees();
    });
  });

  // Add employee modal
  var addEmpOverlay = document.getElementById('addEmployeeOverlay');
  document.getElementById('openAddEmployeeBtn').addEventListener('click', function () {
    clearAddEmpForm();
    loadHotelsForEmployees();
    addEmpOverlay.classList.add('open');
  });
  document.getElementById('closeAddEmpModal').addEventListener('click', function () {
    addEmpOverlay.classList.remove('open');
  });
  addEmpOverlay.addEventListener('click', function (e) {
    if (e.target === addEmpOverlay) addEmpOverlay.classList.remove('open');
  });

  function clearAddEmpForm() {
    document.getElementById('empName').value = '';
    document.getElementById('empEmail').value = '';
    document.getElementById('empRole').value = '';
    document.getElementById('empHotel').value = '';
    document.getElementById('empPhone').value = '';
    document.getElementById('empPassword').value = '';
    document.getElementById('addEmpError').style.display = 'none';
  }

  document.getElementById('addEmpSubmitBtn').addEventListener('click', function () {
    var btn = this;
    var errEl = document.getElementById('addEmpError');
    errEl.style.display = 'none';

    var name  = document.getElementById('empName').value.trim();
    var email = document.getElementById('empEmail').value.trim();
    var role  = document.getElementById('empRole').value;
    var hotelId = parseInt(document.getElementById('empHotel').value || '0', 10);
    var phone = document.getElementById('empPhone').value.trim();
    var pass  = document.getElementById('empPassword').value;

    if (!name || !email || !role || !pass || !hotelId) {
      errEl.textContent = 'Please fill in all required fields.';
      errEl.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Creating…';

    fetch(API_BASE + '/admin.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'create_employee', full_name: name, email: email, role: role, hotel_id: hotelId, phone: phone, password: pass })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        btn.disabled = false;
        btn.textContent = 'Create Employee Account';
        if (!data.success) {
          errEl.textContent = data.message;
          errEl.style.display = 'block';
          return;
        }
        addEmpOverlay.classList.remove('open');
        loadEmployees();
      })
      .catch(function () {
        btn.disabled = false;
        btn.textContent = 'Create Employee Account';
        errEl.textContent = 'Network error. Please try again.';
        errEl.style.display = 'block';
      });
  });

  loadHotelsForEmployees();

  window.toggleEmployee = function (id, btn) {
    btn.disabled = true;
    fetch(API_BASE + '/admin.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'toggle_employee', employee_id: id })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.success) loadEmployees();
        else { btn.disabled = false; alert(data.message); }
      })
      .catch(function () {
        btn.disabled = false;
        alert('Network error. Please try again.');
      });
  };

  window.deleteEmployee = function (id, btn) {
    if (!confirm('Remove this employee? This cannot be undone.')) return;
    btn.disabled = true;
    fetch(API_BASE + '/admin.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'delete_employee', employee_id: id })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.success) loadEmployees();
        else { btn.disabled = false; alert(data.message); }
      })
      .catch(function () {
        btn.disabled = false;
        alert('Network error. Please try again.');
      });
  };

  // ===== SUPPORT INQUIRIES =====
  function loadSupport() {
    var tbody = document.getElementById('supportTableBody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#bbb;font-size:14px;">Loading…</td></tr>';

    fetch(API_BASE + '/admin.php?action=support', { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.success) {
          tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#e44;font-size:14px;">Failed to load inquiries.</td></tr>';
          return;
        }
        renderSupport(data.inquiries || []);
      })
      .catch(function () {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#e44;font-size:14px;">Network error.</td></tr>';
      });
  }

  function renderSupport(inquiries) {
    var tbody = document.getElementById('supportTableBody');
    var badge = document.getElementById('navSupportBadge');
    var newCount = inquiries.filter(function (q) { return q.status === 'new'; }).length;
    if (badge) {
      if (newCount > 0) {
        badge.textContent = newCount;
        badge.style.display = 'inline';
      } else {
        badge.style.display = 'none';
      }
    }

    if (inquiries.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#bbb;font-size:14px;">No support inquiries yet.</td></tr>';
      return;
    }

    var html = '';
    inquiries.forEach(function (q) {
      var name = escapeHtml((q.first_name || '') + ' ' + (q.last_name || ''));
      var short = (q.message || '').length > 140 ? (q.message || '').slice(0, 140) + '…' : (q.message || '');
      html += '<tr>';
      html += '<td style="padding-left:24px;"><span style="font-weight:600;font-size:13px;font-family:Inter,sans-serif;">' + name + '</span></td>';
      html += '<td style="font-size:12px;color:#666;">' + escapeHtml(q.email || '') + (q.phone ? '<div style="font-size:11px;color:#9a9a9a;">' + escapeHtml(q.phone) + '</div>' : '') + '</td>';
      html += '<td style="font-size:12px;color:#666;max-width:360px;" title="' + escapeHtml(q.message || '') + '">' + escapeHtml(short) + '</td>';
      html += '<td><span class="status-badge status-' + (q.status === 'new' ? 'pending' : q.status === 'closed' ? 'cancelled' : 'approved') + '">' + capitalizeStatus(q.status || 'new') + '</span></td>';
      html += '<td style="font-size:12px;color:#888;">' + formatDate(q.created_at) + '</td>';
      html += '<td style="padding-right:24px;">';
      html += '<select class="support-status-select" data-id="' + q.id + '" style="font-family:Inter,sans-serif;font-size:12px;padding:6px 10px;border:1px solid #e0e0e0;border-radius:8px;background:#fff;cursor:pointer;">';
      ['new', 'read', 'replied', 'closed'].forEach(function (s) {
        html += '<option value="' + s + '"' + (q.status === s ? ' selected' : '') + '>' + s.charAt(0).toUpperCase() + s.slice(1) + '</option>';
      });
      html += '</select>';
      html += '</td></tr>';
    });
    tbody.innerHTML = html;
  }

  // Status change (delegated — table is re-rendered on load)
  var supportTbody = document.getElementById('supportTableBody');
  if (supportTbody) {
    supportTbody.addEventListener('change', function (e) {
      var select = e.target.closest('.support-status-select');
      if (!select) return;
      fetch(API_BASE + '/admin.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'update_support_status', inquiry_id: parseInt(select.getAttribute('data-id'), 10), status: select.value })
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.success) {
            loadSupport();
          } else {
            alert(data.message || 'Could not update the inquiry.');
          }
        })
        .catch(function () {
          alert('Network error. Please try again.');
        });
    });
  }

  // ===== HOTEL MANAGEMENT =====
  var hotelOverlay = document.getElementById('hotelModalOverlay');
  var editingHotelId = 0;

  function openHotelModal(hotel) {
    editingHotelId = hotel ? parseInt(hotel.id, 10) : 0;
    document.getElementById('hotelModalTitle').textContent = hotel ? 'Edit Hotel' : 'Add Hotel';
    document.getElementById('hotelName').value = hotel ? hotel.name : '';
    document.getElementById('hotelLocation').value = hotel ? hotel.location : '';
    document.getElementById('hotelPrice').value = hotel ? hotel.price_per_night : '';
    document.getElementById('hotelTotalRooms').value = hotel ? hotel.total_rooms : 24;
    document.getElementById('hotelRating').value = hotel ? hotel.rating : '';
    document.getElementById('hotelImage').value = '';
    document.getElementById('hotelFormError').style.display = 'none';
    hotelOverlay.classList.add('open');
  }

  function loadHotelsAdmin() {
    var tbody = document.getElementById('hotelsTableBody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#bbb;font-size:14px;">Loading…</td></tr>';

    fetch(API_BASE + '/admin.php?action=hotels', { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.success) {
          tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#e44;font-size:14px;">Failed to load hotels.</td></tr>';
          return;
        }
        allHotels = data.hotels || [];
        renderHotelsAdmin(allHotels);
      })
      .catch(function () {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#e44;font-size:14px;">Network error.</td></tr>';
      });
  }

  function renderHotelsAdmin(hotels) {
    var tbody = document.getElementById('hotelsTableBody');
    if (hotels.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#bbb;font-size:14px;">No hotels yet.</td></tr>';
      return;
    }

    var html = '';
    hotels.forEach(function (h) {
      html += '<tr>';
      html += '<td style="padding-left:24px;"><span style="font-weight:600;font-size:13px;font-family:Inter,sans-serif;">' + escapeHtml(h.name) + '</span></td>';
      html += '<td style="font-size:12px;color:#666;">' + escapeHtml(h.location || '') + '</td>';
      html += '<td style="font-weight:700;font-size:13px;">$' + parseFloat(h.price_per_night).toFixed(0) + '</td>';
      html += '<td style="font-size:13px;color:#666;">★ ' + parseFloat(h.rating || 0).toFixed(1) + '</td>';
      html += '<td style="font-size:13px;color:#666;">' + parseInt(h.total_rooms, 10) + '</td>';
      html += '<td style="padding-right:24px;white-space:nowrap;">';
      html += '<button class="action-btn hotel-edit-btn" data-id="' + h.id + '" style="margin-right:6px;">Edit</button>';
      html += '<button class="action-btn cancel hotel-delete-btn" data-id="' + h.id + '">Delete</button>';
      html += '</td></tr>';
    });
    tbody.innerHTML = html;
  }

  document.getElementById('openAddHotelBtn').addEventListener('click', function () { openHotelModal(null); });
  document.getElementById('closeHotelModal').addEventListener('click', function () { hotelOverlay.classList.remove('open'); });
  hotelOverlay.addEventListener('click', function (e) {
    if (e.target === hotelOverlay) hotelOverlay.classList.remove('open');
  });

  var hotelsTbody = document.getElementById('hotelsTableBody');
  hotelsTbody.addEventListener('click', function (e) {
    var editBtn = e.target.closest('.hotel-edit-btn');
    var delBtn = e.target.closest('.hotel-delete-btn');
    if (editBtn) {
      var hotel = null;
      var id = parseInt(editBtn.getAttribute('data-id'), 10);
      allHotels.forEach(function (h) { if (parseInt(h.id, 10) === id) hotel = h; });
      if (hotel) openHotelModal(hotel);
    }
    if (delBtn) {
      var delId = parseInt(delBtn.getAttribute('data-id'), 10);
      rfModal.confirm({
        title: 'Delete Hotel',
        message: 'This removes the hotel permanently. Hotels with booking history cannot be deleted.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        danger: true,
        onConfirm: function () {
          fetch(API_BASE + '/admin.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ action: 'delete_hotel', id: delId })
          })
            .then(function (r) { return r.json(); })
            .then(function (data) {
              if (data.success) {
                loadHotelsAdmin();
              } else {
                rfModal.error({ title: 'Delete Failed', message: data.message || 'Could not delete the hotel.' });
              }
            })
            .catch(function () {
              rfModal.error({ title: 'Connection Error', message: 'Could not reach the server.' });
            });
        }
      });
    }
  });

  document.getElementById('hotelSaveBtn').addEventListener('click', function () {
    var btn = this;
    var errEl = document.getElementById('hotelFormError');
    errEl.style.display = 'none';

    var payload = {
      action: 'save_hotel',
      id: editingHotelId,
      name: document.getElementById('hotelName').value.trim(),
      location: document.getElementById('hotelLocation').value.trim(),
      price_per_night: parseFloat(document.getElementById('hotelPrice').value || '0'),
      total_rooms: parseInt(document.getElementById('hotelTotalRooms').value || '0', 10),
      rating: parseFloat(document.getElementById('hotelRating').value || '0'),
      image: document.getElementById('hotelImage').value.trim()
    };

    if (!payload.name || !payload.location || payload.price_per_night <= 0 || payload.total_rooms < 1) {
      errEl.textContent = 'Name, location, price, and room count are required.';
      errEl.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Saving…';

    fetch(API_BASE + '/admin.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        btn.disabled = false;
        btn.textContent = 'Save Hotel';
        if (!data.success) {
          errEl.textContent = data.message || 'Could not save the hotel.';
          errEl.style.display = 'block';
          return;
        }
        hotelOverlay.classList.remove('open');
        loadHotelsAdmin();
        loadHotelsForEmployees(); // keep the employee-form hotel dropdown fresh
      })
      .catch(function () {
        btn.disabled = false;
        btn.textContent = 'Save Hotel';
        errEl.textContent = 'Network error. Please try again.';
        errEl.style.display = 'block';
      });
  });

})();
