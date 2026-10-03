// ===== Hotel Detail Page Logic =====
(function () {
  // Hotel data matching room cards on rooms.html
  var hotels = [
    {
      id: 1,
      name: 'The Azure Bay Resort',
      location: 'Marine Drive, Cox\'s Bazar',
      rating: '4.7',
      reviews: '(1,289 Reviews)',
      price: 150,
      image: 'img/rooms/room1.jpg',
      sideImage1: 'img/rooms/hotel-interior1.jpg',
      sideImage2: 'img/rooms/hotel-interior2.jpg',
      description: '<p class="m-0 mb-[20px]">Located in the exclusive Marine Drive area of Cox\'s Bazar, The Azure Bay Resort redefined tropical elegance. Designed for travelers who seek both adventure and serenity, our property blends modern architectural brilliance with the natural beauty of the Bay of Bengal.</p><p class="m-0">Whether you are enjoying a sunset dinner at our rooftop terrace or relaxing in our signature Azure Spa, every moment is crafted to provide a sense of total peace. With 120 high-end suites and 24/7 personalized concierge service, we ensure that your stay is as seamless as the ocean horizon.</p>'
    },
    {
      id: 2,
      name: 'Tea Garden Retreat',
      location: 'Sugandha, Cox\'s Bazar',
      rating: '4.8',
      reviews: '(9,880 Reviews)',
      price: 190,
      image: 'img/rooms/room2.jpg',
      sideImage1: 'img/rooms/hotel-interior1.jpg',
      sideImage2: 'img/rooms/hotel-interior2.jpg',
      description: '<p class="m-0 mb-[20px]">Nestled in the serene Sugandha area of Cox\'s Bazar, Tea Garden Retreat offers a unique blend of nature and luxury. Surrounded by lush tea gardens and rolling hills, the resort provides a tranquil escape from the hustle and bustle of city life.</p><p class="m-0">With 85 beautifully appointed rooms, a world-class spa, and farm-to-table dining, every aspect of your stay is designed to reconnect you with nature while enjoying modern comforts and impeccable service.</p>'
    },
    {
      id: 3,
      name: 'Queen Garden',
      location: 'Inani, Cox\'s Bazar',
      rating: '4.5',
      reviews: '(7,610 Reviews)',
      price: 110,
      image: 'img/rooms/room3.jpg',
      sideImage1: 'img/rooms/hotel-interior1.jpg',
      sideImage2: 'img/rooms/hotel-interior2.jpg',
      description: '<p class="m-0 mb-[20px]">Perched along the pristine shores of Inani Beach, Queen Garden is a haven of elegance and relaxation. The resort features stunning ocean views, lush tropical gardens, and architecture inspired by the region\'s rich cultural heritage.</p><p class="m-0">Enjoy 60 spacious suites, two infinity pools overlooking the sea, and a private beach area. Our dedicated staff ensures every guest experiences the perfect balance of adventure and tranquility during their stay.</p>'
    },
    {
      id: 4,
      name: 'Azure Crest Resort',
      location: 'Kolatoli, Cox\'s Bazar',
      rating: '4.7',
      reviews: '(1,289 Reviews)',
      price: 150,
      image: 'img/rooms/room4.jpg',
      sideImage1: 'img/rooms/hotel-interior1.jpg',
      sideImage2: 'img/rooms/hotel-interior2.jpg',
      description: '<p class="m-0 mb-[20px]">Azure Crest Resort at Kolatoli brings world-class hospitality to the vibrant heart of Cox\'s Bazar. Situated just steps from the famous Kolatoli Beach, this property combines urban convenience with beachfront luxury.</p><p class="m-0">Featuring 100 modern suites, rooftop dining with panoramic sea views, and a full-service wellness center, this location is perfect for travelers who want easy access to the city\'s best restaurants, shops, and nightlife.</p>'
    },
    {
      id: 5,
      name: 'Tea Garden Cove',
      location: 'Laboni, Cox\'s Bazar',
      rating: '4.8',
      reviews: '(9,880 Reviews)',
      price: 190,
      image: 'img/rooms/room5.jpg',
      sideImage1: 'img/rooms/hotel-interior1.jpg',
      sideImage2: 'img/rooms/hotel-interior2.jpg',
      description: '<p class="m-0 mb-[20px]">Tea Garden Cove sits at the gateway to Cox\'s Bazar\'s most iconic beach stretch in Laboni. This boutique property offers an intimate atmosphere with personalized service that sets it apart from larger resorts.</p><p class="m-0">With 45 carefully curated rooms, a signature tea lounge, and direct beach access, guests enjoy a refined coastal experience. The resort\'s organic garden supplies fresh ingredients to the on-site restaurant daily.</p>'
    },
    {
      id: 6,
      name: 'The Nature Royal',
      location: 'Moheshkhali, Cox\'s Bazar',
      rating: '4.5',
      reviews: '(7,610 Reviews)',
      price: 110,
      image: 'img/rooms/room6.jpg',
      sideImage1: 'img/rooms/hotel-interior1.jpg',
      sideImage2: 'img/rooms/hotel-interior2.jpg',
      description: '<p class="m-0 mb-[20px]">Located on the enchanting island of Moheshkhali, The Nature Royal offers a truly unique island getaway. Accessible by a scenic boat ride, the resort is surrounded by mangrove forests, traditional fishing villages, and untouched natural beauty.</p><p class="m-0">Experience 50 eco-luxury cottages, guided island excursions, and locally inspired cuisine. The Nature Royal is the ideal destination for adventurous travelers seeking authentic experiences off the beaten path.</p>'
    }
  ];

  // Services with prices
  var services = {
    spa: 45,
    pool: 30,
    airport: 25,
    breakfast: 20,
    gym: 15,
    laundry: 18
  };

  var roomOptions = {
    single_twin: {
      label: 'Single / Twin Beds',
      price: 0,
      mode: 'night'
    },
    king: {
      label: 'King Bed Room',
      price: 35,
      mode: 'night'
    },
    deluxe_suite: {
      label: 'Deluxe Suite',
      price: 65,
      mode: 'night'
    },
    luxury_suite: {
      label: 'Luxury Suite',
      price: 120,
      mode: 'night'
    }
  };

  // State
  var selectedServices = {};
  var selectedRoomOption = 'single_twin';
  var checkIn, checkOut, nights;

  // Get hotel ID from URL params
  var params = new URLSearchParams(window.location.search);
  var hotelId = parseInt(params.get('id'), 10);
  var locationParam = params.get('location') || '';

  // Guest selection carried over from the homepage search bar
  var guestsParam = parseInt(params.get('adults'), 10) + (parseInt(params.get('children'), 10) || 0);
  var roomsParam = parseInt(params.get('rooms'), 10);
  var guestCount = isNaN(guestsParam) || guestsParam < 1 ? 2 : Math.min(guestsParam, 20);
  var roomsCount = isNaN(roomsParam) || roomsParam < 1 ? 1 : Math.min(roomsParam, 5);

  // Find hotel data
  var hotel = null;
  for (var i = 0; i < hotels.length; i++) {
    if (hotels[i].id === hotelId) {
      hotel = hotels[i];
      break;
    }
  }
  if (!hotel) hotel = hotels[0];

  // Date helpers
  var dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function formatDate(d) {
    return dayNames[d.getDay()] + ',' + ('0' + d.getDate()).slice(-2) + ' ' + monthNames[d.getMonth()] + ' ' + d.getFullYear();
  }

  function toInputValue(d) {
    var y = d.getFullYear();
    var m = ('0' + (d.getMonth() + 1)).slice(-2);
    var day = ('0' + d.getDate()).slice(-2);
    return y + '-' + m + '-' + day;
  }

  function diffDays(a, b) {
    var ms = b.getTime() - a.getTime();
    return Math.max(1, Math.round(ms / 86400000));
  }

  // ===== Populate page =====
  document.getElementById('pageTitle').textContent = hotel.name + ' - RoomFound';
  document.getElementById('hotelName').textContent = hotel.name;
  document.getElementById('hotelLocation').textContent = hotel.location;
  document.getElementById('hotelRating').textContent = hotel.rating;
  document.getElementById('hotelReviews').textContent = hotel.reviews;
  document.getElementById('hotelDescription').innerHTML = hotel.description;
  document.getElementById('mainImage').src = hotel.image;
  document.getElementById('mainImage').alt = hotel.name;
  document.getElementById('sideImage1').src = hotel.sideImage1;
  document.getElementById('sideImage2').src = hotel.sideImage2;
  document.getElementById('perNightPrice').textContent = hotel.price + '$/Night';

  var addReviewBtnClass = 'btn-explore relative overflow-hidden rounded-[32px] px-[24px] py-[12px] font-inter text-[14px] font-medium text-white tracking-[-0.7px] leading-[1.8] border-none cursor-pointer bg-[linear-gradient(111deg,rgb(63,63,63)_18%,rgb(21,21,21)_77%)] shadow-[inset_0px_4px_12px_0px_#081738]';
  var addReviewRowClass = 'flex items-center gap-[14px] mt-[4px]';
  var addReviewHelperText = 'Share your experience with other travelers';

  function mountAddReviewButton() {
    var oldRow = document.getElementById('addReviewRow');
    if (oldRow && oldRow.parentNode) {
      oldRow.parentNode.removeChild(oldRow);
    }

    var hotelTitle = document.getElementById('hotelName');
    if (!hotelTitle || !hotelTitle.parentNode) return null;

    var titleSection = hotelTitle.parentNode;
    var locationAndRatingRow = hotelTitle.nextElementSibling;
    var row = document.createElement('div');
    row.id = 'addReviewRow';
    row.className = addReviewRowClass;

    var button = document.createElement('button');
    button.id = 'addReviewBtn';
    button.type = 'button';
    button.className = addReviewBtnClass;
    button.textContent = 'Add review';

    var helperSpan = document.createElement('span');
    helperSpan.className = 'font-inter text-[14px] text-[#98979b] tracking-[-0.5px]';
    helperSpan.textContent = addReviewHelperText;

    row.appendChild(button);
    row.appendChild(helperSpan);

    if (locationAndRatingRow && locationAndRatingRow.parentNode === titleSection) {
      locationAndRatingRow.insertAdjacentElement('afterend', row);
    } else {
      titleSection.appendChild(row);
    }

    return button;
  }

  // ===== Reviews (server-backed) =====
  var ratingEl = document.getElementById('hotelRating');
  var reviewsCountEl = document.getElementById('hotelReviews');
  var addReviewBtn = mountAddReviewButton();

  function escapeReviewHtml(text) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(String(text == null ? '' : text)));
    return div.innerHTML;
  }

  function starRow(rating) {
    var stars = '';
    for (var i = 1; i <= 5; i++) {
      var filled = i <= Math.round(rating);
      stars += '<svg width="14" height="14" viewBox="0 0 24 24" fill="' + (filled ? '#FFB800' : '#ddd') + '"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
    }
    return '<span style="display:inline-flex;gap:2px;align-items:center;">' + stars + '</span>';
  }

  function renderReviews(data) {
    ratingEl.textContent = (data.avg_rating || 0).toFixed ? Number(data.avg_rating).toFixed(1) : String(data.avg_rating);
    var n = Number(data.reviews_count || 0);
    reviewsCountEl.textContent = '(' + n.toLocaleString('en-US') + (n === 1 ? ' Review)' : ' Reviews)');

    var list = document.getElementById('reviewsList');
    if (!list) return;

    var items = data.reviews || [];
    if (items.length === 0) {
      list.innerHTML = '<p class="font-inter text-[14px] text-[#98979b] tracking-[-0.5px] m-0">No written reviews yet — be the first to share your experience.</p>';
      return;
    }

    var html = '';
    items.forEach(function (r) {
      var initial = (r.author || 'G').charAt(0).toUpperCase();
      var when = r.created_at ? String(r.created_at).slice(0, 10) : '';
      html += '<div class="bg-white border-[0.5px] border-solid border-[#bfbfbf] rounded-[16px] px-[20px] py-[16px] flex flex-col gap-[8px]">' +
        '<div style="display:flex;align-items:center;gap:12px;">' +
          '<span style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#1e2e37,#3a5a6a);color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;font-family:Inter,sans-serif;flex-shrink:0;">' + escapeReviewHtml(initial) + '</span>' +
          '<div style="flex:1;min-width:0;">' +
            '<div class="font-inter text-[14px] font-medium text-[#1e2e37]">' + escapeReviewHtml(r.author) + '</div>' +
            '<div class="font-inter text-[12px] text-[#98979b]">' + escapeReviewHtml(when) + '</div>' +
          '</div>' + starRow(r.rating) +
        '</div>' +
        '<p class="font-inter text-[14px] text-[#3f3f3f] tracking-[-0.3px] leading-[1.6] m-0">' + escapeReviewHtml(r.description) + '</p>' +
      '</div>';
    });
    list.innerHTML = html;
  }

  function loadReviews() {
    fetch('../api/reviews.php?room_id=' + hotel.id, { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.success) renderReviews(data);
      })
      .catch(function () { /* rating stays as seeded */ });
  }

  function openAddReviewModal() {
    fetch('../api/session.php', { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (session) {
        if (!session.success) {
          rfModal.error({
            title: 'Login Required',
            message: 'Please log in to add a review for this hotel.',
            btnText: 'Go to Login',
            onClose: function () { window.location.href = './index.html?login=1'; }
          });
          return;
        }

        if (session.user.role !== 'user') {
          rfModal.error({
            title: 'Guests Only',
            message: 'Reviews can be added with a guest account.'
          });
          return;
        }

        if (!(window.rfModal && typeof window.rfModal.review === 'function')) {
          rfModal.error({
            title: 'Review Modal Unavailable',
            message: 'Please refresh the page and try again.'
          });
          return;
        }

        rfModal.review({
          title: 'Add your review',
          message: 'Rate your stay and add a short description for future guests.',
          confirmText: 'Submit review',
          cancelText: 'Cancel',
          minChars: 8,
          onSubmit: function (payload) {
            fetch('../api/reviews.php', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ room_id: hotel.id, rating: payload.rating, description: payload.description })
            })
              .then(function (r) { return r.json(); })
              .then(function (data) {
                if (data && data.success) {
                  loadReviews();
                  rfModal.success({
                    title: 'Review Added',
                    message: 'Thanks for sharing your experience.',
                    btnText: 'Done'
                  });
                } else {
                  rfModal.error({
                    title: 'Review Failed',
                    message: (data && data.message) || 'Something went wrong. Please try again.'
                  });
                }
              })
              .catch(function () {
                rfModal.error({
                  title: 'Connection Error',
                  message: 'Could not reach the server. Please try again.'
                });
              });
          }
        });
      })
      .catch(function () {
        rfModal.error({
          title: 'Connection Error',
          message: 'Could not verify your login status. Please try again.'
        });
      });
  }

  window.openHotelReviewModal = openAddReviewModal;

  loadReviews();
  if (addReviewBtn) {
    addReviewBtn.addEventListener('click', openAddReviewModal);
  }

  // Re-mount after first paint to guard against stale/altered cached markup.
  requestAnimationFrame(function () {
    var mountedBtn = document.getElementById('addReviewBtn');
    if (!mountedBtn) {
      mountedBtn = mountAddReviewButton();
      if (mountedBtn) mountedBtn.addEventListener('click', openAddReviewModal);
    }
  });

  // Init dates — honor dates carried over from the search bar if provided
  var today = new Date();
  var checkinParam = params.get('checkin');
  var checkoutParam = params.get('checkout');
  var parsedIn = checkinParam && /^\d{4}-\d{2}-\d{2}$/.test(checkinParam) ? new Date(checkinParam + 'T00:00:00') : null;
  var parsedOut = checkoutParam && /^\d{4}-\d{2}-\d{2}$/.test(checkoutParam) ? new Date(checkoutParam + 'T00:00:00') : null;
  var minDate = new Date(today); minDate.setHours(0, 0, 0, 0);

  if (parsedIn && !isNaN(parsedIn.getTime()) && parsedIn >= minDate) {
    checkIn = parsedIn;
  } else {
    checkIn = new Date(today);
  }
  if (parsedOut && !isNaN(parsedOut.getTime()) && parsedOut > checkIn) {
    checkOut = parsedOut;
  } else {
    checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + 3);
  }
  nights = diffDays(checkIn, checkOut);

  document.getElementById('checkInDate').textContent = formatDate(checkIn);
  document.getElementById('checkOutDate').textContent = formatDate(checkOut);
  var travelersSummary = document.getElementById('travelersSummary');
  if (travelersSummary) {
    travelersSummary.textContent = roomsCount + ' Room' + (roomsCount > 1 ? 's' : '') + ', ' + guestCount + ' Guest' + (guestCount > 1 ? 's' : '');
  }

  // Back link
  var backLink = document.getElementById('backLink');
  if (locationParam) {
    backLink.href = './rooms.html?location=' + encodeURIComponent(locationParam);
  }

  // ===== Room Availability =====
  function fetchAvailability() {
    var ciStr = toInputValue(checkIn);
    var coStr = toInputValue(checkOut);
    var url = '../api/availability.php?room_id=' + hotel.id + '&check_in=' + encodeURIComponent(ciStr) + '&check_out=' + encodeURIComponent(coStr);
    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.success) {
          document.getElementById('availabilityCount').textContent = data.available + '/' + data.total_rooms;
        }
      })
      .catch(function (err) { console.error('Availability fetch error:', err); });
  }

  fetchAvailability();

  function getRoomOptionCharge() {
    var option = roomOptions[selectedRoomOption] || roomOptions.single_twin;
    if (option.mode === 'night') return option.price * nights;
    return option.price;
  }

  function getEffectiveNightlyRate() {
    var option = roomOptions[selectedRoomOption] || roomOptions.single_twin;
    return hotel.price + (option.mode === 'night' ? option.price : 0);
  }

  // ===== Price calculation =====
  function updatePrice() {
    var roomCost = hotel.price * roomsCount * nights;
    var roomOptionCost = getRoomOptionCharge() * roomsCount;
    var servicesCost = 0;
    for (var key in selectedServices) {
      if (selectedServices[key]) servicesCost += services[key];
    }
    var addOnsCost = roomOptionCost + servicesCost;
    var taxes = Math.round((roomCost + addOnsCost) * 0.05);
    var total = roomCost + addOnsCost + taxes;
    document.getElementById('totalPrice').textContent = '$' + total;
    document.getElementById('perNightPrice').textContent = getEffectiveNightlyRate() + '$/Night';
  }

  updatePrice();

  // ===== Services toggle =====
  var serviceCards = document.querySelectorAll('.service-card');
  serviceCards.forEach(function (card) {
    if (card.classList.contains('room-option-card')) return;
    card.addEventListener('click', function () {
      var key = card.getAttribute('data-service');
      var isActive = card.classList.toggle('active');
      selectedServices[key] = isActive;
      updatePrice();
    });
  });

  // ===== Room option toggle =====
  var roomOptionCards = document.querySelectorAll('.room-option-card');
  roomOptionCards.forEach(function (card) {
    card.addEventListener('click', function () {
      roomOptionCards.forEach(function (item) {
        item.classList.remove('active');
      });
      card.classList.add('active');
      selectedRoomOption = card.getAttribute('data-room-option') || 'single_twin';
      updatePrice();
    });
  });

  // ===== Date editing =====
  var dateDisplay = document.getElementById('dateDisplay');
  var dateEdit = document.getElementById('dateEdit');
  var checkInInput = document.getElementById('checkInInput');
  var checkOutInput = document.getElementById('checkOutInput');
  var confirmBtn = document.getElementById('confirmDates');
  var cancelBtn = document.getElementById('cancelDates');

  // Set min date for inputs to today
  var todayStr = toInputValue(today);
  checkInInput.setAttribute('min', todayStr);
  checkOutInput.setAttribute('min', todayStr);

  function openDateEditor() {
    checkInInput.value = toInputValue(checkIn);
    checkOutInput.value = toInputValue(checkOut);
    dateDisplay.classList.add('hidden');
    dateEdit.classList.remove('hidden');
    dateEdit.classList.add('flex');
  }

  function closeDateEditor() {
    dateEdit.classList.add('hidden');
    dateEdit.classList.remove('flex');
    dateDisplay.classList.remove('hidden');
  }

  // Click on either date text or arrow to open editor
  document.getElementById('editCheckIn').addEventListener('click', openDateEditor);
  document.getElementById('editCheckOut').addEventListener('click', openDateEditor);

  // When check-in changes, ensure check-out is at least 1 day after
  checkInInput.addEventListener('change', function () {
    var newIn = new Date(checkInInput.value + 'T00:00:00');
    var minOut = new Date(newIn);
    minOut.setDate(minOut.getDate() + 1);
    checkOutInput.setAttribute('min', toInputValue(minOut));
    if (new Date(checkOutInput.value + 'T00:00:00') <= newIn) {
      checkOutInput.value = toInputValue(minOut);
    }
  });

  // Confirm dates
  confirmBtn.addEventListener('click', function () {
    var newIn = new Date(checkInInput.value + 'T00:00:00');
    var newOut = new Date(checkOutInput.value + 'T00:00:00');
    if (isNaN(newIn.getTime()) || isNaN(newOut.getTime()) || newOut <= newIn) return;
    checkIn = newIn;
    checkOut = newOut;
    nights = diffDays(checkIn, checkOut);
    document.getElementById('checkInDate').textContent = formatDate(checkIn);
    document.getElementById('checkOutDate').textContent = formatDate(checkOut);
    updatePrice();
    fetchAvailability();
    closeDateEditor();
  });

  // Cancel
  cancelBtn.addEventListener('click', closeDateEditor);

  // ===== RESERVE BUTTON =====
  var reserveBtn = document.getElementById('reserveBtn');
  if (reserveBtn) {
    reserveBtn.addEventListener('click', function () {
      // Check if user is logged in
      fetch('../api/session.php', { credentials: 'include' })
        .then(function (r) { return r.json(); })
        .then(function (session) {
          if (!session.success) {
            rfModal.error({
              title: 'Login Required',
              message: 'Please log in to make a reservation.',
              btnText: 'Go to Login',
              onClose: function () { window.location.href = './index.html'; }
            });
            return;
          }

          // Calculate prices (mirrors the server-side pricing model exactly —
          // the server recomputes and stores its own numbers)
          var roomCost = hotel.price * roomsCount * nights;
          var roomOption = roomOptions[selectedRoomOption] || roomOptions.single_twin;
          var roomOptionCost = getRoomOptionCharge() * roomsCount;
          var servicesCost = 0;
          var serviceKeys = [];
          for (var key in selectedServices) {
            if (selectedServices[key]) {
              servicesCost += services[key];
              serviceKeys.push(key);
            }
          }
          var addOnsCost = roomOptionCost + servicesCost;
          var taxAmount = Math.round((roomCost + addOnsCost) * 0.05);
          var total = roomCost + addOnsCost + taxAmount;

          var payload = {
            room_id: hotel.id,
            check_in: toInputValue(checkIn),
            check_out: toInputValue(checkOut),
            guests: guestCount,
            rooms_count: roomsCount,
            room_option: selectedRoomOption,
            services: serviceKeys,
            total_price: total
          };

          reserveBtn.disabled = true;
          reserveBtn.querySelector('span').textContent = 'Reserving...';

          fetch('../api/reservations.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
          })
            .then(function (r) { return r.json(); })
            .then(function (data) {
              reserveBtn.disabled = false;
              reserveBtn.querySelector('span').textContent = 'Reserve';
              if (data.success) {
                fetchAvailability();
                rfModal.success({
                  title: 'Reservation Submitted!',
                  message: 'Your booking is pending admin approval. You can track its status from your profile.',
                  btnText: 'View My Bookings',
                  onClose: function () { window.location.href = './profile.html'; }
                });
              } else {
                rfModal.error({
                  title: 'Reservation Failed',
                  message: data.message || 'Something went wrong. Please try again.'
                });
              }
            })
            .catch(function () {
              reserveBtn.disabled = false;
              reserveBtn.querySelector('span').textContent = 'Reserve';
              rfModal.error({
                title: 'Connection Error',
                message: 'Could not reach the server. Please check your connection and try again.'
              });
            });
        })
        .catch(function () {
          rfModal.error({
            title: 'Login Required',
            message: 'Please log in to make a reservation.',
            btnText: 'Go to Login',
            onClose: function () { window.location.href = './index.html'; }
          });
        });
    });
  }
})();
