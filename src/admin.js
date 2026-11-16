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

  // Avatars use steps of the site's navy only
  var avatarColors = ['#1e2e37', '#2c4450', '#3a5a6a', '#4a6572'];
  var SECTION_TITLES = {
    overview: 'Overview', bookings: 'Bookings', users: 'Users', employees: 'Employees',
    hotels: 'Hotels', support: 'Support', settings: 'Settings'
  };

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
      document.getElementById('adminAvatar').textContent = user.name.charAt(0).toUpperCase();
      loadDashboard();
    })
    .catch(function () {
      window.location.href = './index.html';
    });

  // ===== DATE =====
  var now = new Date();
  document.getElementById('todayDate').textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

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
    document.getElementById('pageTitle').textContent = SECTION_TITLES[section] || 'Overview';
    window.scrollTo(0, 0);

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
  // Stats, reservations and hotels are loaded together so every number on the
  // overview (cards, chart, occupancy ring, room board) comes from one snapshot.
  var dashData = { stats: null, reservations: [], hotels: [] };
  var selectedHotel = 'all';
  var ACTIVE_STATUSES = ['pending', 'approved', 'paid'];

  function getJson(url) {
    return fetch(url, { credentials: 'include' }).then(function (r) { return r.json(); });
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function money(v) {
    return '$' + Math.round(parseFloat(v) || 0).toLocaleString('en-US');
  }

  function loadDashboard() {
    Promise.all([
      getJson(API_BASE + '/admin.php?action=stats'),
      getJson(API_BASE + '/admin.php?action=reservations'),
      getJson(API_BASE + '/admin.php?action=hotels')
    ]).then(function (res) {
      if (!res[0] || !res[0].success) throw new Error('stats');
      dashData.stats = res[0].stats;
      window.__adminStats = res[0].stats;
      dashData.reservations = (res[1] && res[1].success) ? res[1].reservations : [];
      dashData.hotels = (res[2] && res[2].success) ? res[2].hotels : [];
      if (dashData.stats.total_rooms_all > 0) TOTAL_ROOMS = dashData.stats.total_rooms_all;

      renderStats(dashData.stats);
      populateHotelFilter();
      renderRevenueChart();
      renderTonight();
      renderRecentBookings(dashData.reservations.slice(0, 6));
      renderActivityFeed(dashData.reservations.slice(0, 8));
    }).catch(function () {
      alert('Could not load dashboard stats. Please refresh the page.');
    });
  }

  // ===== STAT CARDS =====
  function renderStats(s) {
    var by = {};
    (s.by_status || []).forEach(function (item) { by[item.status] = parseInt(item.count, 10) || 0; });
    globalStatusBreakdown = by;
    var pending = parseInt(s.pending_count, 10) || by.pending || 0;

    setText('statBooked', (by.paid || 0).toLocaleString('en-US'));
    setText('statPending', pending.toLocaleString('en-US'));
    setText('statCancelled', (by.cancelled || 0).toLocaleString('en-US'));
    setText('statRevenue', money(s.total_revenue || 0));

    var note = document.getElementById('statPendingNote');
    if (pending > 0) {
      note.innerHTML = '<button type="button" class="stat-link" id="reviewPendingBtn">Review ' + (pending === 1 ? 'request' : 'requests') + '</button>';
      document.getElementById('reviewPendingBtn').addEventListener('click', function () { openBookings('pending'); });
    } else {
      note.textContent = 'Nothing waiting';
    }

    var badge = document.getElementById('navPendingBadge');
    badge.textContent = pending;
    badge.style.display = pending > 0 ? 'inline-flex' : 'none';
  }

  function openBookings(filter) {
    currentFilter = filter;
    document.querySelectorAll('#bookingFilters .filter-btn').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-filter') === filter);
    });
    switchSection('bookings');
  }

  // ===== REVENUE CHART (paid bookings per month, from reservations) =====
  function monthlyRevenue(months) {
    var now = new Date();
    var buckets = [];
    for (var i = months - 1; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ y: d.getFullYear(), m: d.getMonth(), total: 0 });
    }
    dashData.reservations.forEach(function (r) {
      if (r.status !== 'paid') return;
      var d = parseDateValue(r.created_at);
      buckets.forEach(function (b) {
        if (b.y === d.getFullYear() && b.m === d.getMonth()) b.total += parseFloat(r.total_price) || 0;
      });
    });
    return buckets;
  }

  function monthYear(b) {
    return new Date(b.y, b.m, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  function renderRevenueChart() {
    var months = parseInt(document.getElementById('revPeriod').value, 10) || 12;
    var buckets = monthlyRevenue(months);
    var labels = buckets.map(function (b) { return new Date(b.y, b.m, 1).toLocaleDateString('en-US', { month: 'short' }); });
    var fullLabels = buckets.map(function (b) { return new Date(b.y, b.m, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); });
    var values = buckets.map(function (b) { return Math.round(b.total); });
    var total = values.reduce(function (a, b) { return a + b; }, 0);
    var max = Math.max.apply(null, values);
    var lastIdx = values.length - 1;

    setText('revTotal', money(total));
    setText('revCaption', 'Paid bookings, ' + monthYear(buckets[0]) + ' – ' + monthYear(buckets[lastIdx]));

    var canvas = document.getElementById('revenueChart');
    if (revenueChartInstance) revenueChartInstance.destroy();

    // Hover: dashed guide and a small value card, in the panel's own palette.
    var hoverPlugin = {
      id: 'revenueHover',
      afterDraw: function (chart) {
        var active = chart.getActiveElements();
        if (!active || !active.length) return;
        var point = chart.getDatasetMeta(0).data[active[0].index];
        if (!point) return;
        var ctx = chart.ctx;
        var area = chart.chartArea;
        var idx = active[0].index;

        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(30,46,55,0.16)';
        ctx.moveTo(point.x, area.top);
        ctx.lineTo(point.x, area.bottom);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#1e2e37';
        ctx.stroke();

        var valText = money(values[idx]);
        var subText = fullLabels[idx];
        ctx.font = '500 14px Inter, sans-serif';
        var w1 = ctx.measureText(valText).width;
        ctx.font = '400 12px Inter, sans-serif';
        var w2 = ctx.measureText(subText).width;
        var boxW = Math.max(w1, w2) + 24;
        var boxH = 48;
        var boxX = Math.min(Math.max(point.x - boxW / 2, area.left), area.right - boxW);
        var boxY = point.y - boxH - 12;
        if (boxY < area.top) boxY = point.y + 12;

        ctx.shadowColor = 'rgba(7,2,0,0.08)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 4;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(boxX, boxY, boxW, boxH, 10); else ctx.rect(boxX, boxY, boxW, boxH);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(30,46,55,0.08)';
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.font = '500 14px Inter, sans-serif';
        ctx.fillStyle = '#070200';
        ctx.fillText(valText, boxX + 12, boxY + 21);
        ctx.font = '400 12px Inter, sans-serif';
        ctx.fillStyle = '#98979b';
        ctx.fillText(subText, boxX + 12, boxY + 38);
        ctx.restore();
      }
    };

    revenueChartInstance = new Chart(canvas, {
      type: 'line',
      plugins: [hoverPlugin],
      data: {
        labels: labels,
        datasets: [{
          label: 'Revenue',
          data: values,
          borderColor: '#1e2e37',
          borderWidth: 2,
          tension: 0.35,
          fill: true,
          backgroundColor: function (context) {
            var area = context.chart.chartArea;
            if (!area) return 'rgba(30,46,55,0.06)';
            var g = context.chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
            g.addColorStop(0, 'rgba(30,46,55,0.12)');
            g.addColorStop(1, 'rgba(30,46,55,0)');
            return g;
          },
          // The current month is marked; hover shows the rest.
          pointRadius: values.map(function (_, i) { return i === lastIdx ? 4 : 0; }),
          pointBackgroundColor: '#1e2e37',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointHoverRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        animation: { duration: 400 },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          y: {
            beginAtZero: true,
            suggestedMax: max > 0 ? undefined : 1000,
            grid: { color: 'rgba(30,46,55,0.06)' },
            border: { display: false },
            ticks: {
              maxTicksLimit: 5,
              font: { family: 'Inter', size: 12 },
              color: '#98979b',
              padding: 8,
              callback: function (v) {
                if (v >= 1000) return '$' + (v / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 }) + 'k';
                return '$' + v;
              }
            }
          },
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { font: { family: 'Inter', size: 12 }, color: '#98979b', padding: 8 }
          }
        }
      }
    });
  }

  // ===== TONIGHT: occupancy ring + room board =====
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  // Rooms taken tonight: a stay covers check-in (inclusive) to check-out
  // (exclusive), the same rule the booking API uses for availability.
  function tonightFor(hotelId) {
    var today = todayKey();
    var reserved = 0;
    var pending = 0;
    dashData.reservations.forEach(function (r) {
      if (hotelId !== 'all' && String(r.room_id) !== String(hotelId)) return;
      if (ACTIVE_STATUSES.indexOf(r.status) === -1) return;
      var ci = String(r.check_in).slice(0, 10);
      var co = String(r.check_out).slice(0, 10);
      if (!(ci <= today && co > today)) return;
      var n = parseInt(r.rooms_count, 10) || 1;
      if (r.status === 'pending') pending += n; else reserved += n;
    });
    var total = 0;
    dashData.hotels.forEach(function (h) {
      if (hotelId === 'all' || String(h.id) === String(hotelId)) total += parseInt(h.total_rooms, 10) || 0;
    });
    if (!total && hotelId === 'all') total = TOTAL_ROOMS;
    reserved = Math.min(reserved, total);
    pending = Math.min(pending, Math.max(0, total - reserved));
    return { reserved: reserved, pending: pending, free: Math.max(0, total - reserved - pending), total: total };
  }

  function hotelById(id) {
    var found = null;
    dashData.hotels.forEach(function (h) { if (String(h.id) === String(id)) found = h; });
    return found;
  }

  function populateHotelFilter() {
    var select = document.getElementById('hotelFilter');
    var hotels = dashData.hotels.slice().sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
    var html = '<option value="all">All hotels</option>';
    hotels.forEach(function (h) {
      html += '<option value="' + h.id + '">' + escapeHtml(h.name) + '</option>';
    });
    select.innerHTML = html;
    if (selectedHotel !== 'all' && !hotelById(selectedHotel)) selectedHotel = 'all';
    select.value = selectedHotel;
  }

  function renderTonight() {
    var t = tonightFor(selectedHotel);
    var hotel = selectedHotel === 'all' ? null : hotelById(selectedHotel);
    setText('occupancyScope', hotel ? hotel.name : 'All hotels');
    renderOccupancy(t);
    renderRoomBoard(t, hotel);
  }

  function renderOccupancy(t) {
    var taken = t.reserved + t.pending;
    var pct = t.total > 0 ? (taken / t.total) * 100 : 0;
    setText('occupancyPct', (pct > 0 && pct < 10 ? pct.toFixed(1) : Math.round(pct)) + '%');
    setText('occupancySub', taken + ' of ' + t.total + ' rooms');

    var canvas = document.getElementById('occupancyChart');
    if (occupancyChartInstance) occupancyChartInstance.destroy();
    occupancyChartInstance = new Chart(canvas, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: t.total > 0 ? [t.reserved, t.pending, t.free] : [0, 0, 1],
          backgroundColor: ['#1e2e37', '#9fb0b9', '#efeeeb'],
          borderWidth: 0,
          spacing: taken > 0 && t.free > 0 ? 2 : 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '80%',
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        animation: { duration: 400 }
      }
    });

    var rows = [
      { label: 'Reserved', value: t.reserved, sw: 'sw-reserved' },
      { label: 'Awaiting approval', value: t.pending, sw: 'sw-pending' },
      { label: 'Free', value: t.free, sw: 'sw-free' }
    ];
    document.getElementById('statusLegend').innerHTML = rows.map(function (r) {
      return '<div class="legend-row"><i class="sw ' + r.sw + '"></i><span class="lbl">' + r.label + '</span>' +
        '<span class="val">' + r.value.toLocaleString('en-US') + (r.value === 1 ? ' room' : ' rooms') + '</span></div>';
    }).join('');
  }

  function renderRoomBoard(t, hotel) {
    var body = document.getElementById('roomBoardBody');

    if (!hotel) {
      setText('roomBoardCaption', 'Rooms taken tonight in each hotel');
      var rows = dashData.hotels.map(function (h) {
        var ht = tonightFor(h.id);
        return { h: h, t: ht, share: ht.total ? (ht.reserved + ht.pending) / ht.total : 0 };
      }).sort(function (a, b) {
        return (b.share - a.share) || String(a.h.name).localeCompare(String(b.h.name));
      });
      if (!rows.length) {
        body.innerHTML = '<p class="card-sub" style="margin:0;">No hotels yet</p>';
        return;
      }
      body.innerHTML = '<div class="board-list">' + rows.map(function (row) {
        var tt = row.t;
        var resPct = tt.total ? (tt.reserved / tt.total) * 100 : 0;
        var penPct = tt.total ? (tt.pending / tt.total) * 100 : 0;
        var place = String(row.h.location || '').split(',')[0];
        return '<div class="board-row">' +
          '<div class="board-top"><span class="board-name">' + escapeHtml(row.h.name) +
          (place ? '<span class="board-loc">' + escapeHtml(place) + '</span>' : '') + '</span>' +
          '<span class="board-count"><b>' + (tt.reserved + tt.pending) + '</b> of ' + tt.total + '</span></div>' +
          '<div class="board-bar"><span class="reserved" style="width:' + resPct + '%"></span><span class="pending" style="width:' + penPct + '%"></span></div>' +
          '</div>';
      }).join('') + '</div>';
      return;
    }

    setText('roomBoardCaption', (hotel.location ? hotel.location + ' · ' : '') + t.total + ' rooms, tonight');
    var html = '';
    for (var i = 0; i < t.total; i++) {
      var type = i < t.reserved ? 'reserved' : (i < t.reserved + t.pending ? 'pending' : 'free');
      var label = type === 'reserved' ? 'Reserved' : (type === 'pending' ? 'Awaiting approval' : 'Free');
      html += '<div class="room-tag ' + type + '" title="Room ' + pad2(i + 1) + ': ' + label + '">' + pad2(i + 1) + '</div>';
    }
    body.innerHTML = '<div class="room-tags">' + html + '</div>';
  }

  document.getElementById('hotelFilter').addEventListener('change', function () {
    selectedHotel = this.value;
    renderTonight();
  });
  document.getElementById('revPeriod').addEventListener('change', renderRevenueChart);

  // ===== SHARED ROW CELLS =====
  function guestCell(name, email) {
    var initial = (name || 'U').charAt(0).toUpperCase();
    var color = avatarColors[initial.charCodeAt(0) % avatarColors.length];
    return '<div class="guest-cell"><div class="user-avatar" style="background:' + color + ';">' + initial + '</div>' +
      '<div><div class="cell-strong">' + escapeHtml(name || 'Unknown') + '</div>' +
      (email ? '<div class="cell-sub">' + escapeHtml(email) + '</div>' : '') + '</div></div>';
  }

  function stayCell(r) {
    var a = parseDateValue(r.check_in);
    var b = parseDateValue(r.check_out);
    var left = a.toLocaleDateString('en-US', a.getFullYear() === b.getFullYear()
      ? { month: 'short', day: 'numeric' }
      : { month: 'short', day: 'numeric', year: 'numeric' });
    var right = b.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    var nights = parseInt(r.nights, 10) || Math.max(1, Math.round((b - a) / 86400000));
    return '<div style="white-space:nowrap;">' + left + ' – ' + right + '</div>' +
      '<div class="cell-sub">' + nights + (nights === 1 ? ' night' : ' nights') + '</div>';
  }

  function emptyRow(cols, text, isError) {
    return '<tr><td colspan="' + cols + '" class="empty-cell' + (isError ? ' is-error' : '') + '">' + text + '</td></tr>';
  }

  // ===== RECENT BOOKINGS TABLE =====
  function renderRecentBookings(reservations) {
    var tbody = document.getElementById('recentBookingsBody');
    if (!reservations || reservations.length === 0) {
      tbody.innerHTML = emptyRow(5, 'No bookings yet');
      return;
    }
    tbody.innerHTML = reservations.map(function (r) {
      return '<tr>' +
        '<td>' + guestCell(r.user_name, r.user_email) + '</td>' +
        '<td class="cell-muted">' + escapeHtml(r.hotel_name) + '</td>' +
        '<td>' + stayCell(r) + '</td>' +
        '<td>' + (parseInt(r.guests, 10) || 1) + '</td>' +
        '<td><span class="status-badge status-' + r.status + '">' + capitalizeStatus(r.status) + '</span></td>' +
        '</tr>';
    }).join('');
  }

  // ===== ACTIVITY FEED (notification dropdown) =====
  function renderActivityFeed(reservations) {
    var feed = document.getElementById('activityFeed');
    var notifCountEl = document.getElementById('notifCount');
    var notifDot = document.getElementById('notifDot');

    if (!reservations || reservations.length === 0) {
      feed.innerHTML = '<div class="notif-empty">No recent activity</div>';
      notifCountEl.textContent = '';
      return;
    }

    notifCountEl.textContent = 'Latest ' + reservations.length;
    notifDot.style.display = 'block';

    var dots = { paid: '#2f6e57', pending: '#98979b', approved: '#1e2e37', cancelled: '#8b5e5e' };
    var actions = {
      paid: 'paid for a stay at',
      pending: 'requested a booking at',
      approved: 'was approved for',
      cancelled: 'cancelled a booking at'
    };

    feed.innerHTML = reservations.map(function (r) {
      var s = r.status || 'pending';
      return '<div class="activity-item">' +
        '<span class="activity-dot" style="background:' + (dots[s] || dots.pending) + ';"></span>' +
        '<div style="flex:1;min-width:0;">' +
        '<div class="activity-text"><strong>' + escapeHtml(r.user_name || 'Guest') + '</strong> ' + (actions[s] || 'updated') + ' <strong>' + escapeHtml(r.hotel_name) + '</strong></div>' +
        '<div class="activity-time">' + getTimeAgo(r.created_at) + '</div>' +
        '</div></div>';
    }).join('');
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
      tbody.innerHTML = emptyRow(8, 'No bookings found');
      return;
    }

    var html = '';
    reservations.forEach(function (r) {
      html += '<tr>';
      html += '<td>' + guestCell(r.user_name, r.user_email) + '</td>';
      html += '<td class="cell-muted">' + escapeHtml(r.hotel_name) + '</td>';
      html += '<td>' + stayCell(r) + '<div class="cell-sub">Booked ' + formatDate(r.created_at) + ', ' + formatTime(r.created_at) + '</div></td>';
      html += '<td>' + r.rooms_count + '</td>';
      html += '<td>' + r.guests + '</td>';
      html += '<td class="cell-strong">' + money(r.total_price) + '</td>';
      html += '<td><span class="status-badge status-' + r.status + '">' + capitalizeStatus(r.status) + '</span></td>';
      html += '<td style="white-space:nowrap;">';

      if (r.status === 'pending') {
        html += '<button class="action-btn approve" onclick="updateReservation(' + r.id + ', \'approved\')">Approve</button> ';
        html += '<button class="action-btn cancel" onclick="updateReservation(' + r.id + ', \'cancelled\')">Cancel</button>';
      } else if (r.status === 'approved') {
        html += '<button class="action-btn cancel" onclick="updateReservation(' + r.id + ', \'cancelled\')">Cancel</button>';
      } else {
        html += '<span class="cell-none">—</span>';
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
      tbody.innerHTML = emptyRow(5, 'No users yet');
      return;
    }

    var html = '';
    users.forEach(function (u) {
      var role = String(u.role || 'user');
      html += '<tr>';
      html += '<td>' + guestCell(u.full_name, '') + '</td>';
      html += '<td class="cell-muted">' + escapeHtml(u.email) + '</td>';
      html += '<td><span class="status-badge ' + (role === 'admin' ? 'status-approved' : 'status-pending') + '">' + role.charAt(0).toUpperCase() + role.slice(1) + '</span></td>';
      html += '<td>' + (u.reservation_count || 0) + '</td>';
      html += '<td class="cell-muted">' + formatDate(u.created_at) + '</td>';
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

        var options = '<option value="">Select hotel</option>';
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
    tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">Loading employees…</td></tr>';

    fetch(API_BASE + '/admin.php?action=employees', { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        allEmployees = data.employees || [];
        renderEmployees();
      })
      .catch(function () {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-cell is-error">Could not load employees</td></tr>';
      });
  }

  function renderEmployees() {
    var tbody = document.getElementById('empTableBody');
    var filtered = empCurrentRole === 'all' ? allEmployees : allEmployees.filter(function (e) { return e.role === empCurrentRole; });

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">No employees yet</td></tr>';
      return;
    }

    var html = '';
    filtered.forEach(function (emp) {
      var isActive = parseInt(emp.is_active) === 1;

      html += '<tr>';
      html += '<td>' + guestCell(emp.full_name, '') + '</td>';
      html += '<td class="cell-muted">' + escapeHtml(emp.email) + '</td>';
      html += '<td><span class="role-badge role-' + emp.role + '">';
      html += emp.role === 'manager' ? 'Manager' : 'Waiter';
      html += '</span></td>';
      html += '<td class="cell-muted">' + (emp.hotel_name ? escapeHtml(emp.hotel_name) : '<span class="cell-none">Not assigned</span>') + '</td>';
      html += '<td class="cell-muted">' + (emp.phone ? escapeHtml(emp.phone) : '<span class="cell-none">—</span>') + '</td>';
      html += '<td><span class="status-badge ' + (isActive ? 'status-paid' : 'status-cancelled') + '">' + (isActive ? 'Active' : 'Inactive') + '</span></td>';
      html += '<td class="cell-muted">' + formatDate(emp.created_at) + '</td>';
      html += '<td style="white-space:nowrap;">';
      html += '<button class="action-btn" onclick="toggleEmployee(' + emp.id + ', this)">' + (isActive ? 'Deactivate' : 'Activate') + '</button>';
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
        btn.textContent = 'Create account';
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
        btn.textContent = 'Create account';
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
    tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">Loading…</td></tr>';

    fetch(API_BASE + '/admin.php?action=support', { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.success) {
          tbody.innerHTML = '<tr><td colspan="6" class="empty-cell is-error">Could not load inquiries</td></tr>';
          return;
        }
        renderSupport(data.inquiries || []);
      })
      .catch(function () {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-cell is-error">Could not reach the server</td></tr>';
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
      tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">No support inquiries yet</td></tr>';
      return;
    }

    var html = '';
    inquiries.forEach(function (q) {
      var name = escapeHtml((q.first_name || '') + ' ' + (q.last_name || ''));
      var short = (q.message || '').length > 140 ? (q.message || '').slice(0, 140) + '…' : (q.message || '');
      html += '<tr>';
      html += '<td><span class="cell-strong">' + name + '</span></td>';
      html += '<td class="cell-muted">' + escapeHtml(q.email || '') + (q.phone ? '<div class="cell-sub">' + escapeHtml(q.phone) + '</div>' : '') + '</td>';
      html += '<td class="cell-muted" style="max-width:360px;font-size:13px;line-height:1.5;" title="' + escapeHtml(q.message || '') + '">' + escapeHtml(short) + '</td>';
      html += '<td><span class="status-badge status-' + (q.status === 'new' ? 'pending' : q.status === 'closed' ? 'cancelled' : 'approved') + '">' + capitalizeStatus(q.status || 'new') + '</span></td>';
      html += '<td class="cell-muted" style="white-space:nowrap;">' + formatDate(q.created_at) + '</td>';
      html += '<td>';
      html += '<select class="select support-status-select" data-id="' + q.id + '" aria-label="Inquiry status" style="height:32px;">';
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
    document.getElementById('hotelModalTitle').textContent = hotel ? 'Edit hotel' : 'Add hotel';
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
    tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">Loading…</td></tr>';

    fetch(API_BASE + '/admin.php?action=hotels', { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.success) {
          tbody.innerHTML = '<tr><td colspan="6" class="empty-cell is-error">Could not load hotels</td></tr>';
          return;
        }
        allHotels = data.hotels || [];
        renderHotelsAdmin(allHotels);
      })
      .catch(function () {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-cell is-error">Could not reach the server</td></tr>';
      });
  }

  function renderHotelsAdmin(hotels) {
    var tbody = document.getElementById('hotelsTableBody');
    if (hotels.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">No hotels yet</td></tr>';
      return;
    }

    var html = '';
    hotels.forEach(function (h) {
      html += '<tr>';
      html += '<td><span class="cell-strong">' + escapeHtml(h.name) + '</span></td>';
      html += '<td class="cell-muted">' + escapeHtml(h.location || '') + '</td>';
      html += '<td class="cell-strong">' + money(h.price_per_night) + '</td>';
      html += '<td class="cell-muted">' + parseFloat(h.rating || 0).toFixed(1) + '</td>';
      html += '<td class="cell-muted">' + parseInt(h.total_rooms, 10) + '</td>';
      html += '<td style="white-space:nowrap;">';
      html += '<button class="action-btn hotel-edit-btn" data-id="' + h.id + '">Edit</button>';
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
        btn.textContent = 'Save hotel';
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
        btn.textContent = 'Save hotel';
        errEl.textContent = 'Network error. Please try again.';
        errEl.style.display = 'block';
      });
  });

})();
