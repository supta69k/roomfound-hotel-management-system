// ========================================
// Rooms Data - renders hotel cards from the public API
// Used by index.html (top 3 cards) and rooms.html (full grid).
// The static HTML cards act as a no-JS/failed-fetch fallback: on API
// failure this script leaves them untouched.
// ========================================

(function () {
  "use strict";

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatReviews(count) {
    return Number(count || 0).toLocaleString("en-US");
  }

  // Shared SVG snippets (icons already exist in the static markup).
  var PIN_SVG =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="shrink-0"><path d="M12 21s-7-5.1-7-11a7 7 0 1114 0c0 5.9-7 11-7 11z" fill="#0a0915"/><circle cx="12" cy="10" r="2.6" fill="#fff"/></svg>';
  var STAR_OUTLINE_SVG =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" class="shrink-0"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="#98979b" stroke-width="1.5" stroke-linejoin="round"/></svg>';
  var ARROW_UP_RIGHT_SVG =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M7 17L17 7M9 7h8v8" stroke="#0a0915" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var PIN_SMALL_SVG =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#000" stroke-width="1.5"/><circle cx="12" cy="9" r="2.5" stroke="#000" stroke-width="1.5"/></svg>';
  var STAR_FILL_SVG =
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="#FFB800"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
  var ARROW_RIGHT_SVG =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="-rotate-45"><path d="M5 12h14M12 5l7 7-7 7" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function fetchRooms(query) {
    var url = "../api/rooms.php" + (query || "");
    return fetch(url, { headers: { Accept: "application/json" } })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.success || !Array.isArray(data.rooms)) {
          throw new Error((data && data.message) || "Bad API response");
        }
        return data.rooms;
      });
  }

  // ===== Homepage: "Our top rated Hotels" (top 3 by rating) =====
  var hotelsRow = document.getElementById("hotelsRow");
  if (hotelsRow) {
    fetchRooms("?limit=3")
      .then(function (rooms) {
        if (!rooms.length) return;
        hotelsRow.innerHTML = rooms
          .map(function (room) {
            return (
              '<div class="room-card shrink-0 w-[300px] md:w-[444px] cursor-pointer" data-hotel-id="' +
              room.id +
              '" onclick="window.location.href=\'./hotel.html?id=' +
              room.id +
              '\'">' +
              '<div class="relative h-[240px] md:h-[348px] rounded-[16px] overflow-hidden">' +
              '<img src="' +
              escapeHtml(room.image) +
              '" alt="' +
              escapeHtml(room.name) +
              '" class="w-full h-full object-cover" loading="lazy">' +
              '<div class="absolute left-[9px] bottom-[11px] bg-white rounded-[31px] px-[16px] py-[8px] flex items-center gap-[10px]">' +
              PIN_SVG +
              '<span class="font-inter text-[16px] text-black tracking-[-1px] leading-[1.6] whitespace-nowrap">' +
              escapeHtml(room.location) +
              "</span></div></div>" +
              '<div class="p-[10px] flex flex-col gap-[6px]">' +
              '<p class="font-abeezee text-[24px] text-[rgba(10,9,21,0.9)] tracking-[-1px] leading-[1.4] m-0">' +
              escapeHtml(room.name) +
              "</p>" +
              '<div class="flex items-center gap-[8px]">' +
              STAR_OUTLINE_SVG +
              '<span class="font-inter text-[16px] text-[#98979b] tracking-[-1px] leading-[1.6]">' +
              room.rating.toFixed(1) +
              ' <span class="ml-[4px]">(' +
              formatReviews(room.reviews_count) +
              " Reviews)</span></span></div>" +
              '<div class="flex items-end justify-between">' +
              '<div class="flex flex-col">' +
              '<span class="font-inter font-medium text-[24px] text-[#0a0915] tracking-[-1px] leading-[1.7]">$' + Math.round(room.price_per_night) + "</span>" +
              '<span class="font-inter text-[12px] text-[#98979b] leading-[1.6]">Include taxes &amp; Fees</span></div>' +
              '<span class="room-arrow-btn bg-white rounded-full size-[56px] flex items-center justify-center shadow-[2px_2px_8.5px_rgba(0,0,0,0.25)] cursor-pointer">' +
              ARROW_UP_RIGHT_SVG +
              "</span></div></div></div>"
            );
          })
          .join("");
      })
      .catch(function () {
        /* keep static fallback cards */
      });
  }

  // ===== Rooms page: full grid, optionally filtered by ?location= =====
  var roomsGrid = document.getElementById("roomsGrid");
  if (roomsGrid) {
    var params = new URLSearchParams(window.location.search);
    var location = params.get("location") || "";
    var query = location ? "?location=" + encodeURIComponent(location) : "";

    fetchRooms(query)
      .then(function (rooms) {
        if (!rooms.length) return;

        roomsGrid.innerHTML = rooms
          .map(function (room) {
            return (
              '<div class="flex flex-col gap-[5px] room-card" data-hotel-id="' +
              room.id +
              '">' +
              '<div class="relative h-[296px] rounded-[14px] overflow-hidden shadow-[1.7px_1.7px_7.2px_0px_rgba(0,0,0,0.25)]">' +
              '<img src="' +
              escapeHtml(room.image) +
              '" alt="' +
              escapeHtml(room.name) +
              '" class="w-full h-full object-cover" loading="lazy">' +
              '<div class="absolute bottom-[12px] left-[8px] bg-white rounded-[26px] py-[7px] px-[14px] flex items-center gap-[8.5px]">' +
              PIN_SMALL_SVG +
              '<span class="font-inter text-[13.6px] text-black tracking-[-0.85px] leading-[1.6] whitespace-nowrap">' +
              escapeHtml(room.location) +
              "</span></div></div>" +
              '<div class="flex items-end justify-between p-[8.5px]">' +
              '<div class="flex flex-col gap-[5px]">' +
              '<p class="font-abeezee text-[20.4px] text-[rgba(10,9,21,0.9)] tracking-[-0.85px] leading-[1.4] m-0">' +
              escapeHtml(room.name) +
              "</p>" +
              '<div class="flex items-center gap-[7px]">' +
              STAR_FILL_SVG +
              '<span class="font-inter text-[13.6px] text-[#98979b] tracking-[-0.85px] leading-[1.6]">' +
              room.rating.toFixed(1) +
              "</span>" +
              '<span class="font-inter text-[13.6px] text-[#98979b] tracking-[-0.85px] leading-[1.6]">(' +
              formatReviews(room.reviews_count) +
              " Reviews)</span></div>" +
              "<div>" +
              '<p class="font-inter text-[20.4px] font-medium text-[#0a0915] tracking-[-0.85px] leading-[1.7] m-0">$' + Math.round(room.price_per_night) + "</p>" +
              '<p class="font-inter text-[10.2px] text-[#98979b] tracking-[-0.85px] leading-[1.6] m-0">Include taxes &amp; Fees</p></div></div>' +
              '<button class="room-arrow-btn w-[48px] h-[48px] bg-white rounded-[24px] flex items-center justify-center cursor-pointer border-none shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">' +
              ARROW_RIGHT_SVG +
              "</button></div></div>"
            );
          })
          .join("");

        var titleEl = document.getElementById("resultsTitle");
        if (titleEl) {
          titleEl.textContent =
            rooms.length +
            " results found" +
            (location ? " for " + location : "");
        }
      })
      .catch(function () {
        /* keep static fallback grid */
      });
  }
})();
