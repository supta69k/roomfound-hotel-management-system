// ===== RoomFound Blog Article Reader Modal =====
(function () {
  'use strict';

  var articles = {
    '1': {
      title: 'The Hidden Trails of Sreemangal: A Journey Through the Green',
      category: 'Eco-Travel & Discovery',
      author: 'Fahim Rahman',
      date: 'October 2026',
      readTime: '6 min read',
      image: 'img/home/news-featured.jpg',
      content: [
        'Tucked away in the northeastern corner of Bangladesh, Sreemangal is known as the tea capital of the country. Beyond the emerald slopes that stretch toward the horizon lies an ancient ecosystem alive with vibrant wildlife and untouched rainforest trails.',
        'Waking before dawn at an eco-retreat reveals one of Bengal\'s most breathtaking spectacles: a thick, milky mist blanketing endless rows of tea bushes while morning songbirds break the stillness. Treks through Lawachara National Park offer encounters with rare Hoolock gibbons swinging through the canopy, capped langurs, and towering century-old mahogany trees.',
        'After hours traversing hidden jungle trails, travelers can unwind in serene cottages nestled among lemon and pineapple groves. A visit to Nilkantha Tea Cabin to experience the legendary multi-layered tea provides a sweet conclusion to days spent exploring nature\'s quietest sanctuaries.'
      ],
      hotelRecommendation: 'Sylhet Tea Resort & Jaflong Valley Lodge'
    },
    '2': {
      title: 'Sunset Serenity: Why Cox\'s Bazar Remains the Crown Jewel of the Coast',
      category: 'Coastal Escapes',
      author: 'Nusrat Jahan',
      date: 'October 2026',
      readTime: '4 min read',
      image: 'img/home/news-2.jpg',
      content: [
        'Stretching over 120 continuous kilometers along the Bay of Bengal, Cox\'s Bazar is revered globally as the longest natural unbroken sea beach in existence. Yet beyond the lively main shores of Laboni and Sugandha, a deeper sense of coastal tranquility awaits.',
        'Driving south down the Marine Drive highway reveals towering verdant hills on one side and turquoise waves breaking on the other. At Inani and Himchari, natural coral boulders emerge from glistening sand bars during low tide, offering unforgettable sunset walks far removed from the city buzz.',
        'Luxury beachfront retreats now provide panoramic infinity pools, seaside dining, and peaceful ocean breezes. Whether watching fishing sampans return home under amber dusk skies or falling asleep to rolling tides, Cox\'s Bazar never loses its timeless romance.'
      ],
      hotelRecommendation: 'The Azure Bay Resort & Queen Garden Inani'
    },
    '3': {
      title: 'Beyond the Lobby: Discovering the Secret History of Heritage Hotels',
      category: 'Architecture & Heritage',
      author: 'Tanvir Ahmed',
      date: 'September 2026',
      readTime: '5 min read',
      image: 'img/home/news-2.jpg',
      content: [
        'There is an undeniable intimacy to staying in a hotel where the architecture tells a story. Across Bangladesh, a growing movement of heritage preservation is transforming historical estates into boutique luxury hotels that honor regional craftsmanship.',
        'High wooden-beamed ceilings, shaded verandas designed for monsoon downpours, hand-carved mahogany furnishings, and terracotta brickwork evoke a bygone era of slow travel. Hoteliers carefully balance historic preservation with five-star contemporary comforts.',
        'When you walk down corridors lined with brass lanterns and curated vintage photographs, you aren\'t merely checking into a room — you are inhabiting a living chapter of South Asian hospitality history.'
      ],
      hotelRecommendation: 'Dhaka River View Hotel & Queen Garden'
    },
    '4': {
      title: 'Urban Oasis: Finding Peace and Quiet in the Heart of Dhaka',
      category: 'City Escapes & Luxury',
      author: 'Ayesha Siddiqua',
      date: 'September 2026',
      readTime: '4 min read',
      image: 'img/home/news-3.jpg',
      content: [
        'Dhaka is one of the world\'s most energetic and bustling metropolises, known for vibrant rickshaw art, brisk business districts, and spirited streets. Yet hidden within its prime diplomatic zones are tranquil sanctuaries designed for restorative rest.',
        'Modern boutique hotels in Gulshan and Banani have redefined the urban staycation. Rooftop infinity pools offer panoramic skyline views high above the hum of the city, while serene wellness spas provide organic aromatherapy and quietude.',
        'With fine dining restaurants blending traditional Bengali spices with international culinary arts, these properties offer travelers and locals alike the ultimate city retreat.'
      ],
      hotelRecommendation: 'The Grand Dhaka Palace, Gulshan'
    },
    '5': {
      title: 'The Anatomy of a Five-Star Suite: What Makes a Room Truly Grand?',
      category: 'Hospitality Design',
      author: 'RoomFound Editorial Team',
      date: 'August 2026',
      readTime: '5 min read',
      image: 'img/rooms/hotel-interior1.jpg',
      content: [
        'What distinguishes a good hotel room from an extraordinary stay? True hospitality luxury lives in the invisible details that cater to guest comfort before they even notice.',
        'Acoustic isolation ensures deep sleep undisturbed by hallway noise or city traffic. Temperature-regulating Egyptian cotton linens, dual pillow menus, and tailored blackout drapes create a sanctuary tailored for deep relaxation.',
        'Beyond furnishings, bespoke hospitality experiences — such as curated local tea assortments, personalized welcome notes, and intuitive ambient lighting controls — create emotional connections that turn a one-night booking into an unforgettable lifetime memory.'
      ],
      hotelRecommendation: 'The Azure Bay Resort & Sundarbans Safari Lodge'
    }
  };

  // Inject modal styles
  var style = document.createElement('style');
  style.textContent = [
    '.rf-blog-overlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(20,28,33,0.5);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;pointer-events:none;transition:opacity .25s ease;padding:16px;}',
    '.rf-blog-overlay.is-open{opacity:1;pointer-events:auto;}',
    '.rf-blog-card{background:#fff;border-radius:24px;width:760px;max-width:100%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,0.22);transform:scale(0.92) translateY(12px);transition:transform .28s cubic-bezier(.175,.885,.32,1.275);overflow:hidden;}',
    '.rf-blog-overlay.is-open .rf-blog-card{transform:scale(1) translateY(0);}',
    '.rf-blog-body{overflow-y:auto;padding:32px 36px 40px;}',
    '.rf-blog-body::-webkit-scrollbar{width:6px;}',
    '.rf-blog-body::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:4px;}',
    '@media(max-width:640px){.rf-blog-body{padding:20px 20px 28px;}}'
  ].join('');
  document.head.appendChild(style);

  // Modal Container
  var overlay = document.createElement('div');
  overlay.className = 'rf-blog-overlay';
  overlay.innerHTML = [
    '<div class="rf-blog-card" role="dialog" aria-modal="true">',
      '<div class="flex items-center justify-between px-[28px] py-[18px] border-b border-[#e5e5e5] bg-[#faf9f8]">',
        '<span id="rfBlogCategory" class="font-inter text-[12px] font-semibold text-[#1e2e37] uppercase tracking-[1px] bg-[#e8edef] px-[12px] py-[4px] rounded-[16px]">Blog</span>',
        '<button id="rfBlogClose" class="w-[36px] h-[36px] rounded-full flex items-center justify-center bg-white border border-[#ddd] hover:bg-[#eee] transition-colors cursor-pointer" aria-label="Close">',
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="#333" stroke-width="2" stroke-linecap="round"/></svg>',
        '</button>',
      '</div>',
      '<div class="rf-blog-body font-inter text-[#070200]">',
        '<h2 id="rfBlogTitle" class="font-abeezee text-[24px] md:text-[30px] text-[#0a0915] tracking-[-0.8px] leading-[1.3] m-0 mb-[16px]"></h2>',
        '<div class="flex items-center gap-[12px] text-[13px] text-[#98979b] mb-[24px] pb-[16px] border-b border-[#eee]">',
          '<span id="rfBlogAuthor" class="font-medium text-[#1e2e37]"></span>',
          '<span>•</span>',
          '<span id="rfBlogDate"></span>',
          '<span>•</span>',
          '<span id="rfBlogReadTime"></span>',
        '</div>',
        '<div class="overflow-hidden rounded-[16px] mb-[24px] shadow-[0_4px_16px_rgba(0,0,0,0.08)] max-h-[340px]">',
          '<img id="rfBlogImg" src="" alt="" class="w-full h-full object-cover">',
        '</div>',
        '<div id="rfBlogParagraphs" class="flex flex-col gap-[16px] text-[15px] md:text-[16px] text-[#444] leading-[1.75] font-normal tracking-[-0.2px]"></div>',
        '<div class="mt-[32px] pt-[24px] border-t border-[#eee] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-[16px] bg-[#f7f6f4] p-[20px] rounded-[16px]">',
          '<div>',
            '<p class="font-inter text-[12px] text-[#98979b] uppercase tracking-[0.5px] m-0 mb-[4px]">Recommended Stays</p>',
            '<p id="rfBlogHotel" class="font-inter font-medium text-[15px] text-[#1e2e37] m-0"></p>',
          '</div>',
          '<a href="./rooms.html" class="inline-block shrink-0 rounded-[32px] px-[24px] py-[10px] font-inter text-[13px] font-medium text-white tracking-[-0.5px] leading-[1.7] no-underline border-none cursor-pointer bg-[linear-gradient(111deg,rgb(63,63,63)_18%,rgb(21,21,21)_77%)] shadow-[inset_0px_4px_12px_0px_#081738] hover:opacity-95 text-center">',
            'Find Rooms &rarr;',
          '</a>',
        '</div>',
      '</div>',
    '</div>'
  ].join('');
  document.body.appendChild(overlay);

  function openArticle(id) {
    var item = articles[id] || articles['1'];
    document.getElementById('rfBlogCategory').textContent = item.category;
    document.getElementById('rfBlogTitle').textContent = item.title;
    document.getElementById('rfBlogAuthor').textContent = item.author;
    document.getElementById('rfBlogDate').textContent = item.date;
    document.getElementById('rfBlogReadTime').textContent = item.readTime;
    document.getElementById('rfBlogImg').src = item.image;
    document.getElementById('rfBlogImg').alt = item.title;
    document.getElementById('rfBlogHotel').textContent = item.hotelRecommendation;

    var pContainer = document.getElementById('rfBlogParagraphs');
    pContainer.innerHTML = item.content.map(function (p) {
      return '<p class="m-0">' + p + '</p>';
    }).join('');

    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeArticle() {
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  // Close triggers
  var closeBtn = document.getElementById('rfBlogClose');
  if (closeBtn) closeBtn.addEventListener('click', closeArticle);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeArticle();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeArticle();
  });

  // Attach to blog cards in #news
  document.addEventListener('DOMContentLoaded', function () {
    var newsSection = document.getElementById('news');
    if (!newsSection) return;

    var links = newsSection.querySelectorAll('a[data-blog-id]');
    links.forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        var id = link.getAttribute('data-blog-id');
        openArticle(id);
      });
    });
  });

  // Expose helper globally
  window.rfOpenBlog = openArticle;
})();
