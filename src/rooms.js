// ===== Rooms Page Logic =====
(function () {
  var params = new URLSearchParams(window.location.search);
  var location = params.get('location');

  var titleEl = document.getElementById('resultsTitle');
  var cards = document.querySelectorAll('.room-card');

  if (location && titleEl) {
    titleEl.textContent = cards.length + ' results found for ' + location;
  }

  // Navigate to hotel detail page on card click
  cards.forEach(function (card) {
    card.addEventListener('click', function () {
      var hotelId = card.getAttribute('data-hotel-id');
      var loc = location || '';
      var url = './hotel.html?id=' + encodeURIComponent(hotelId);
      if (loc) {
        url += '&location=' + encodeURIComponent(loc);
      }
      // Carry the guest selection through so the hotel page can prefill it
      ['checkin', 'checkout', 'rooms', 'adults', 'children'].forEach(function (key) {
        var value = params.get(key);
        if (value) {
          url += '&' + key + '=' + encodeURIComponent(value);
        }
      });
      window.location.href = url;
    });
  });

  // ===== Sort dropdown =====
  var sortBox = document.getElementById('sortBox');
  var sortMenu = document.getElementById('sortMenu');
  var sortLabel = document.getElementById('sortLabel');
  if (!sortBox || !sortMenu) return;

  sortBox.addEventListener('click', function (e) {
    e.stopPropagation();
    sortMenu.classList.toggle('hidden');
  });
  document.addEventListener('click', function () {
    sortMenu.classList.add('hidden');
  });

  sortMenu.addEventListener('click', function (e) {
    e.stopPropagation();
    var option = e.target.closest('.sort-option');
    if (!option) return;
    sortMenu.classList.add('hidden');

    var mode = option.getAttribute('data-sort');
    if (mode === 'top') {
      sortLabel.textContent = 'Sort by: Our top Picks';
      sortCards(null);
      return;
    }
    if (mode === 'price_asc') sortLabel.textContent = 'Sort by: Price low-high';
    if (mode === 'price_desc') sortLabel.textContent = 'Sort by: Price high-low';
    if (mode === 'rating') sortLabel.textContent = 'Sort by: Highest rated';
    sortCards(mode);
  });

  function sortCards(mode) {
    if (!mode) return; // "top" = original DOM order
    var grid = document.getElementById('roomsGrid');
    var list = Array.prototype.slice.call(grid.querySelectorAll('.room-card'));

    function priceOf(card) {
      var match = card.textContent.match(/\$(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    }
    function ratingOf(card) {
      var match = card.textContent.match(/★?\s*(\d\.\d)\s*\(?\d/);
      return match ? parseFloat(match[1]) : 0;
    }

    if (mode === 'price_asc') list.sort(function (a, b) { return priceOf(a) - priceOf(b); });
    if (mode === 'price_desc') list.sort(function (a, b) { return priceOf(b) - priceOf(a); });
    if (mode === 'rating') list.sort(function (a, b) { return ratingOf(b) - ratingOf(a); });

    list.forEach(function (card) { grid.appendChild(card); });
  }
})();
