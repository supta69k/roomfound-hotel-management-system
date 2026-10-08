// ========================================
// Search Bar - Interactive Functionality
// ========================================

(function () {
  "use strict";

  // --- State ---
  const state = {
    location: "Cox's Bazar",
    checkinDate: null,
    checkoutDate: null,
    rooms: 1,
    adults: 2,
    children: 1,
    checkinMonth: new Date().getMonth(),
    checkinYear: new Date().getFullYear(),
    checkoutMonth: new Date().getMonth(),
    checkoutYear: new Date().getFullYear(),
  };

  // --- Locations ---
  const locations = [
    { name: "Cox's Bazar", region: "Chittagong Division" },
    { name: "Dhaka", region: "Dhaka Division" },
    { name: "Chittagong", region: "Chittagong Division" },
    { name: "Sylhet", region: "Sylhet Division" },
    { name: "Saint Martin", region: "Chittagong Division" },
    { name: "Sundarbans", region: "Khulna Division" },
    { name: "Rangamati", region: "Chittagong Division" },
    { name: "Bandarban", region: "Chittagong Division" },
    { name: "Khulna", region: "Khulna Division" },
    { name: "Rajshahi", region: "Rajshahi Division" },
    { name: "Sreemangal", region: "Sylhet Division" },
    { name: "Kuakata", region: "Barishal Division" },
  ];

  const MONTHS = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];
  const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  let activeModal = null;

  // --- DOM refs ---
  const els = {};
  function initRefs() {
    els.locationSection = document.getElementById("locationSection");
    els.checkinSection = document.getElementById("checkinSection");
    els.checkoutSection = document.getElementById("checkoutSection");
    els.roomguestSection = document.getElementById("roomguestSection");
    els.locationModal = document.getElementById("locationModal");
    els.checkinModal = document.getElementById("checkinModal");
    els.checkoutModal = document.getElementById("checkoutModal");
    els.roomguestModal = document.getElementById("roomguestModal");
    els.locationValue = document.getElementById("locationValue");
    els.checkinValue = document.getElementById("checkinValue");
    els.checkoutValue = document.getElementById("checkoutValue");
    els.roomValue = document.getElementById("roomValue");
    els.guestValue = document.getElementById("guestValue");
    els.roomCount = document.getElementById("roomCount");
    els.adultCount = document.getElementById("adultCount");
    els.childCount = document.getElementById("childCount");
    els.locationSearch = document.getElementById("locationSearch");
    els.locationList = document.getElementById("locationList");
    els.checkAvailBtn = document.getElementById("checkAvailBtn");
  }

  // --- Position modal below its trigger section ---
  function positionModal(sectionEl, modalEl) {
    const rect = sectionEl.getBoundingClientRect();
    const modalWidth = parseInt(modalEl.style.width) || 320;
    let left = rect.left + rect.width / 2 - modalWidth / 2;
    // Keep within viewport
    if (left < 8) left = 8;
    if (left + modalWidth > window.innerWidth - 8) left = window.innerWidth - modalWidth - 8;
    modalEl.style.left = left + "px";
    // Open above the search bar
    modalEl.style.bottom = (window.innerHeight - rect.top + 12) + "px";
    modalEl.style.top = "auto";
  }

  // --- Open / Close modals ---
  function openModal(type) {
    const sectionMap = {
      location: els.locationSection,
      checkin: els.checkinSection,
      checkout: els.checkoutSection,
      roomguest: els.roomguestSection,
    };
    const modalMap = {
      location: els.locationModal,
      checkin: els.checkinModal,
      checkout: els.checkoutModal,
      roomguest: els.roomguestModal,
    };

    const section = sectionMap[type];
    const modal = modalMap[type];
    if (!section || !modal) return;

    // If same modal is open, close it
    if (activeModal === type) {
      closeAllModals();
      return;
    }

    closeAllModals();
    positionModal(section, modal);
    modal.classList.add("active");
    activeModal = type;

    // Type-specific init
    if (type === "location") {
      renderLocations();
      els.locationSearch.value = "";
      setTimeout(function () { els.locationSearch.focus(); }, 100);
    }
    if (type === "checkin") renderCalendar("checkin");
    if (type === "checkout") renderCalendar("checkout");
  }

  function closeAllModals() {
    document.querySelectorAll(".dropdown-modal").forEach(function (m) {
      m.classList.remove("active");
    });
    activeModal = null;
  }

  // --- Location rendering ---
  function renderLocations(filter) {
    var filtered = locations;
    if (filter) {
      var lowerFilter = filter.toLowerCase();
      filtered = locations.filter(function (l) {
        return l.name.toLowerCase().indexOf(lowerFilter) !== -1 ||
               l.region.toLowerCase().indexOf(lowerFilter) !== -1;
      });
    }

    els.locationList.innerHTML = filtered
      .map(function (loc) {
        return '<div class="location-item" data-location="' + loc.name.replace(/"/g, '&quot;') + '">' +
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none">' +
          '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#999"/>' +
          '</svg>' +
          '<div>' +
          '<div style="font-weight:500;color:#333;">' + loc.name + '</div>' +
          '<div style="font-size:13px;color:#999;">' + loc.region + '</div>' +
          '</div></div>';
      })
      .join("");
  }

  function selectLocation(name) {
    state.location = name;
    els.locationValue.textContent = name;
    els.locationValue.style.color = "#000";
    closeAllModals();
  }

  // --- Calendar rendering ---
  function renderCalendar(type) {
    var month = state[type + "Month"];
    var year = state[type + "Year"];
    var headerEl = document.getElementById(type + "DaysHeader");
    var calEl = document.getElementById(type + "Calendar");
    var monthYearEl = document.getElementById(type + "MonthYear");

    monthYearEl.textContent = MONTHS[month] + " " + year;

    headerEl.innerHTML = DAY_NAMES
      .map(function (d) { return '<div class="calendar-header-day">' + d + '</div>'; })
      .join("");

    var firstDay = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    var html = "";
    for (var i = 0; i < firstDay; i++) {
      html += '<div class="calendar-day disabled"></div>';
    }

    for (var d = 1; d <= daysInMonth; d++) {
      var date = new Date(year, month, d);
      var isPast = date < today;
      var isToday = date.getTime() === today.getTime();
      var selectedDate = type === "checkin" ? state.checkinDate : state.checkoutDate;
      var isSelected = selectedDate && date.getTime() === selectedDate.getTime();

      var isDisabled = isPast;
      if (type === "checkout" && state.checkinDate) {
        isDisabled = date <= state.checkinDate;
      }

      var cls = "calendar-day";
      if (isDisabled) cls += " disabled";
      if (isToday) cls += " today";
      if (isSelected) cls += " selected";

      html += '<div class="' + cls + '" data-cal-type="' + type + '" data-cal-year="' + year + '" data-cal-month="' + month + '" data-cal-day="' + d + '">' + d + '</div>';
    }

    calEl.innerHTML = html;
  }

  function selectDate(type, year, month, day) {
    var date = new Date(year, month, day);
    state[type + "Date"] = date;

    var formatted = MONTHS[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear();
    var valueEl = type === "checkin" ? els.checkinValue : els.checkoutValue;
    valueEl.textContent = formatted;
    valueEl.style.color = "#070200";

    if (type === "checkin" && state.checkoutDate && state.checkoutDate <= date) {
      state.checkoutDate = null;
      els.checkoutValue.textContent = "Select date";
      els.checkoutValue.style.color = "#999";
    }

    if (type === "checkin") {
      state.checkoutMonth = month;
      state.checkoutYear = year;
      closeAllModals();
      setTimeout(function () { openModal("checkout"); }, 250);
    } else {
      closeAllModals();
    }
  }

  function changeMonth(type, dir) {
    state[type + "Month"] += dir;
    if (state[type + "Month"] > 11) {
      state[type + "Month"] = 0;
      state[type + "Year"]++;
    } else if (state[type + "Month"] < 0) {
      state[type + "Month"] = 11;
      state[type + "Year"]--;
    }
    renderCalendar(type);
  }

  // --- Room & Guest ---
  function updateCount(type, delta) {
    if (type === "room") {
      state.rooms = Math.max(1, Math.min(5, state.rooms + delta));
      els.roomCount.textContent = state.rooms;
      els.roomValue.textContent = state.rooms;
    } else if (type === "adult") {
      state.adults = Math.max(1, Math.min(10, state.adults + delta));
      els.adultCount.textContent = state.adults;
      updateGuestDisplay();
    } else if (type === "child") {
      state.children = Math.max(0, Math.min(6, state.children + delta));
      els.childCount.textContent = state.children;
      updateGuestDisplay();
    }
  }

  function updateGuestDisplay() {
    els.guestValue.textContent = state.adults + state.children;
  }

  // --- Check Availability ---
  function toLocalDateString(date) {
    // Format from local date parts — toISOString() would shift the day for
    // users in positive UTC offsets (e.g. UTC+6).
    var y = date.getFullYear();
    var m = ("0" + (date.getMonth() + 1)).slice(-2);
    var d = ("0" + date.getDate()).slice(-2);
    return y + "-" + m + "-" + d;
  }

  function checkAvailability() {
    if (!state.location) {
      alert("Please select a location");
      return;
    }
    if (!state.checkinDate) {
      alert("Please select a check-in date");
      return;
    }
    if (!state.checkoutDate) {
      alert("Please select a check-out date");
      return;
    }

    var params = {
      location: state.location,
      checkin: toLocalDateString(state.checkinDate),
      checkout: toLocalDateString(state.checkoutDate),
      rooms: state.rooms,
      adults: state.adults,
      children: state.children,
    };

    var query = new URLSearchParams(params).toString();

    // Navigate to search results page
    window.location.href = "rooms.html?" + query;
  }

  // ===== EVENT LISTENERS =====
  document.addEventListener("DOMContentLoaded", function () {
    initRefs();
    updateGuestDisplay();

    // Section clicks → open modals
    els.locationSection.addEventListener("click", function (e) {
      e.stopPropagation();
      openModal("location");
    });
    els.checkinSection.addEventListener("click", function (e) {
      e.stopPropagation();
      openModal("checkin");
    });
    els.checkoutSection.addEventListener("click", function (e) {
      e.stopPropagation();
      openModal("checkout");
    });
    els.roomguestSection.addEventListener("click", function (e) {
      e.stopPropagation();
      openModal("roomguest");
    });

    // Check availability button
    els.checkAvailBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      checkAvailability();
    });

    // Location search input
    els.locationSearch.addEventListener("input", function () {
      renderLocations(this.value);
    });
    els.locationSearch.addEventListener("click", function (e) {
      e.stopPropagation();
    });

    // Location item clicks (event delegation)
    els.locationList.addEventListener("click", function (e) {
      e.stopPropagation();
      var item = e.target.closest(".location-item");
      if (item) {
        var name = item.getAttribute("data-location");
        selectLocation(name);
      }
    });

    // Calendar day clicks (event delegation on both calendars)
    els.checkinModal.addEventListener("click", function (e) {
      e.stopPropagation();
      var dayEl = e.target.closest(".calendar-day");
      if (dayEl && !dayEl.classList.contains("disabled")) {
        var type = dayEl.getAttribute("data-cal-type");
        var year = parseInt(dayEl.getAttribute("data-cal-year"));
        var month = parseInt(dayEl.getAttribute("data-cal-month"));
        var day = parseInt(dayEl.getAttribute("data-cal-day"));
        if (type) selectDate(type, year, month, day);
      }
    });

    els.checkoutModal.addEventListener("click", function (e) {
      e.stopPropagation();
      var dayEl = e.target.closest(".calendar-day");
      if (dayEl && !dayEl.classList.contains("disabled")) {
        var type = dayEl.getAttribute("data-cal-type");
        var year = parseInt(dayEl.getAttribute("data-cal-year"));
        var month = parseInt(dayEl.getAttribute("data-cal-month"));
        var day = parseInt(dayEl.getAttribute("data-cal-day"));
        if (type) selectDate(type, year, month, day);
      }
    });

    // Calendar navigation buttons (event delegation)
    document.querySelectorAll(".cal-nav").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var type = this.getAttribute("data-type");
        var dir = parseInt(this.getAttribute("data-dir"));
        changeMonth(type, dir);
      });
    });

    // Room & guest counter buttons (event delegation)
    document.querySelectorAll(".count-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var counterType = this.getAttribute("data-counter");
        var dir = parseInt(this.getAttribute("data-dir"));
        updateCount(counterType, dir);
      });
    });

    // Prevent modal clicks from closing
    els.locationModal.addEventListener("click", function (e) { e.stopPropagation(); });
    els.roomguestModal.addEventListener("click", function (e) { e.stopPropagation(); });

    // Click anywhere else → close modals
    document.addEventListener("click", function () {
      closeAllModals();
    });

    // Reposition on scroll/resize
    window.addEventListener("scroll", function () {
      if (activeModal) {
        var sectionMap = {
          location: els.locationSection,
          checkin: els.checkinSection,
          checkout: els.checkoutSection,
          roomguest: els.roomguestSection,
        };
        var modalMap = {
          location: els.locationModal,
          checkin: els.checkinModal,
          checkout: els.checkoutModal,
          roomguest: els.roomguestModal,
        };
        positionModal(sectionMap[activeModal], modalMap[activeModal]);
      }
    });
  });
})();
