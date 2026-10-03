// Loyalty Program JavaScript

document.addEventListener('DOMContentLoaded', function () {
    var slider = document.querySelector('.loyalty-slider');
    var sliderWindow = document.querySelector('.loyalty-slider-window');
    var track = document.getElementById('loyaltySliderTrack');
    var cards = track ? Array.prototype.slice.call(track.querySelectorAll('.loyalty-card')) : [];
    var prevButton = document.querySelector('.loyalty-nav-prev');
    var nextButton = document.querySelector('.loyalty-nav-next');
    var dotsRoot = document.getElementById('loyaltySliderDots');

    if (!slider || !sliderWindow || !track || !cards.length || !dotsRoot || !prevButton || !nextButton) {
        return;
    }

    var currentIndex = 0;
    var intervalId = null;
    var autoSlideDelay = 4800;

    function formatPoints(value) {
        return (Number(value) || 0).toLocaleString('en-US');
    }

    function formatCompactPoints(value) {
        var num = Number(value) || 0;
        if (num < 1000) return String(num);
        var compact = Math.round((num / 1000) * 10) / 10;
        return (compact % 1 === 0 ? compact.toFixed(0) : compact.toFixed(1)) + 'k';
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function getCard(tierName) {
        return cards.find(function (card) {
            return String(card.getAttribute('data-tier') || '').toLowerCase() === String(tierName || '').toLowerCase();
        });
    }

    function setCardContent(tierName, pointsBalance, totalEarned, message, percent) {
        var card = getCard(tierName);
        if (!card) return;

        var values = card.querySelectorAll('.loyalty-metric-value');
        if (values[0]) values[0].textContent = formatPoints(pointsBalance);
        if (values[1]) values[1].textContent = formatCompactPoints(totalEarned);

        var msgEl = card.querySelector('.loyalty-message');
        if (msgEl) msgEl.textContent = message;

        var pctEl = card.querySelector('.loyalty-percent');
        if (pctEl) pctEl.textContent = percent + '%';

        card.style.setProperty('--progress', percent + '%');

        var progressTrack = card.querySelector('.loyalty-progress-track');
        if (progressTrack) progressTrack.setAttribute('aria-valuenow', String(percent));
    }

    function applyLoyaltyState(loyalty) {
        var pointsBalance = Number(loyalty.points_balance || 0);
        var totalEarned = Number(loyalty.total_earned || 0);
        var tier = String(loyalty.tier || 'Silver');

        var toGold = Math.max(0, 600 - totalEarned);
        var toPlatinum = Math.max(0, 1500 - totalEarned);

        var silverPercent = clamp(Math.round((totalEarned / 600) * 100), 0, 100);
        var goldPercent = totalEarned < 600
            ? clamp(Math.round((totalEarned / 600) * 100), 0, 100)
            : clamp(Math.round(((totalEarned - 600) / 900) * 100), 0, 100);
        var platinumPercent = clamp(Math.round((totalEarned / 1500) * 100), 0, 100);

        setCardContent(
            'Silver',
            pointsBalance,
            totalEarned,
            toGold > 0 ? ('Get ' + formatPoints(toGold) + ' more points to go Gold') : 'Gold unlocked. Keep earning for Platinum.',
            silverPercent
        );

        setCardContent(
            'Gold',
            pointsBalance,
            totalEarned,
            totalEarned < 600
                ? ('Need ' + formatPoints(toGold) + ' points to unlock Gold')
                : (toPlatinum > 0 ? ('Get ' + formatPoints(toPlatinum) + ' more points to go Platinum') : 'Platinum unlocked. You reached elite status.'),
            goldPercent
        );

        setCardContent(
            'Platinum',
            pointsBalance,
            totalEarned,
            toPlatinum > 0 ? ('Need ' + formatPoints(toPlatinum) + ' more points to unlock Platinum') : 'You reached the top tier. Keep earning rewards.',
            toPlatinum > 0 ? platinumPercent : 100
        );

        var insightMain = document.querySelector('.tier-insight-main');
        var insightSub = document.querySelector('.tier-insight-sub');
        if (insightMain) insightMain.textContent = 'Current Tier: ' + tier;
        if (insightSub) {
            if (tier === 'Platinum') {
                insightSub.textContent = 'Top tier unlocked with ' + formatPoints(totalEarned) + ' total points';
            } else if (tier === 'Gold') {
                insightSub.textContent = formatPoints(toPlatinum) + ' points away from Platinum';
            } else {
                insightSub.textContent = formatPoints(toGold) + ' points away from Gold';
            }
        }

        if (tier === 'Gold') {
            goTo(1);
        } else if (tier === 'Platinum') {
            goTo(2);
        } else {
            goTo(0);
        }
    }

    function createDots() {
        dotsRoot.innerHTML = '';

        cards.forEach(function (card, index) {
            var tier = card.getAttribute('data-tier') || ('Tier ' + (index + 1));
            var dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'loyalty-dot';
            dot.setAttribute('aria-label', 'Go to ' + tier + ' card');
            dot.addEventListener('click', function () {
                goTo(index);
                resetAutoSlide();
            });
            dotsRoot.appendChild(dot);
        });
    }

    function updateUI() {
        track.style.transform = 'translateX(-' + (currentIndex * 100) + '%)';

        cards.forEach(function (card, idx) {
            var isActive = idx === currentIndex;
            card.setAttribute('aria-hidden', isActive ? 'false' : 'true');
        });

        var dots = dotsRoot.querySelectorAll('.loyalty-dot');
        dots.forEach(function (dot, idx) {
            var isActive = idx === currentIndex;
            dot.classList.toggle('active', isActive);
            dot.setAttribute('aria-current', isActive ? 'true' : 'false');
        });
    }

    function goTo(index) {
        var maxIndex = cards.length - 1;
        if (index < 0) {
            currentIndex = maxIndex;
        } else if (index > maxIndex) {
            currentIndex = 0;
        } else {
            currentIndex = index;
        }

        updateUI();
    }

    function next() {
        goTo(currentIndex + 1);
    }

    function prev() {
        goTo(currentIndex - 1);
    }

    function startAutoSlide() {
        stopAutoSlide();
        intervalId = window.setInterval(next, autoSlideDelay);
    }

    function stopAutoSlide() {
        if (intervalId) {
            window.clearInterval(intervalId);
            intervalId = null;
        }
    }

    function resetAutoSlide() {
        startAutoSlide();
    }

    var activeSubscriptionGrid = document.getElementById('activeSubscriptionGrid');
    var redeemList = document.getElementById('redeemList');
    var frontendCatalog = collectFrontendCatalog();
    var currentLoyalty = {
        points_balance: 0,
        total_earned: 0,
        tier: 'Silver'
    };
    var currentCatalog = [];
    var activeSubscriptionsByKey = {};
    var redeemModal = null;
    var redeemModalState = {
        brandKey: ''
    };
    var redeemInFlight = false;
    var subscriptionDetailsModal = null;
    var subscriptionDetailsState = {
        subscriptionId: 0
    };
    var pointsHistoryModal = null;
    var pointsHistoryState = {
        totals: {
            earned: 0,
            used: 0,
            balance: 0,
            count: 0
        },
        entries: []
    };

    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = String(text || '');
        return div.innerHTML;
    }

    function showGuestOnlyNotice(message) {
        if (document.getElementById('loyaltyAccessNotice')) return;

        var notice = document.createElement('div');
        notice.id = 'loyaltyAccessNotice';
        notice.className = 'loyalty-access-notice';
        notice.setAttribute('role', 'alert');
        notice.innerHTML = [
            '<p class="loyalty-access-title">' + escapeHtml(message || 'This area is for guest accounts only.') + '</p>',
            '<p class="loyalty-access-copy">Loyalty points, subscriptions and redeeming are only available to guest accounts.</p>',
            '<a class="loyalty-access-link" href="./index.html">Back to Home</a>'
        ].join('');

        document.body.insertBefore(notice, document.body.firstChild);
    }

    function readLoyaltyResponse(response) {
        return response.json().catch(function () {
            return { success: false, message: '' };
        }).then(function (data) {
            if (response.status === 403) {
                showGuestOnlyNotice(data && data.message);
            }
            return data;
        });
    }

    function normalizeKey(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
    }

    function collectFrontendCatalog() {
        var catalog = {};
        var offerIcons = [
            './img/loyalty/drink.svg',
            './img/loyalty/natural-food.svg',
            './img/loyalty/serving-food.svg'
        ];

        if (activeSubscriptionGrid) {
            var activeCards = activeSubscriptionGrid.querySelectorAll('.subscription-card');
            activeCards.forEach(function (card) {
                var nameEl = card.querySelector('.subscription-brand-name');
                if (!nameEl) return;
                var brandName = nameEl.textContent.trim();
                var brandKey = card.getAttribute('data-brand-key') || normalizeKey(brandName);
                var logoEl = card.querySelector('.subscription-brand-logo img');
                var tierEl = card.querySelector('.subscription-tier');
                var durationEl = card.querySelector('.subscription-date');
                var offerEls = card.querySelectorAll('.subscription-offer-list li span');
                var offers = [];
                offerEls.forEach(function (item) {
                    offers.push(item.textContent.trim());
                });

                catalog[brandKey] = {
                    brand_key: brandKey,
                    brand_name: brandName,
                    brand_logo: logoEl ? logoEl.getAttribute('src') : '',
                    tier_plan: tierEl ? tierEl.textContent.trim() : 'Silver',
                    duration_label: durationEl ? durationEl.textContent.trim() : '1 Month',
                    points_cost: 600,
                    monthly_price: 45,
                    offers: offers,
                    offer_icons: offerIcons
                };
            });
        }

        if (redeemList) {
            var redeemRows = redeemList.querySelectorAll('.redeem-row');
            redeemRows.forEach(function (row) {
                var nameEl = row.querySelector('.redeem-brand-name');
                if (!nameEl) return;
                var brandName = nameEl.textContent.trim();
                var brandKey = row.getAttribute('data-brand-key') || normalizeKey(brandName);
                var logoEl = row.querySelector('.redeem-brand-logo img');
                var tierEl = row.querySelector('.redeem-tier');
                var durationEl = row.querySelector('.redeem-time');
                var pointsEl = row.querySelector('.redeem-points-btn span');
                var pointsCost = Number(pointsEl ? pointsEl.textContent.trim() : 600) || 600;

                if (!catalog[brandKey]) {
                    catalog[brandKey] = {
                        brand_key: brandKey,
                        brand_name: brandName,
                        brand_logo: logoEl ? logoEl.getAttribute('src') : '',
                        tier_plan: tierEl ? tierEl.textContent.trim() : 'Silver',
                        duration_label: durationEl ? durationEl.textContent.trim() : '1 Month',
                        points_cost: pointsCost,
                        monthly_price: 45,
                        offers: ['None'],
                        offer_icons: [
                            './img/loyalty/drink.svg',
                            './img/loyalty/natural-food.svg',
                            './img/loyalty/serving-food.svg'
                        ]
                    };
                } else {
                    catalog[brandKey].points_cost = pointsCost;
                }
            });
        }

        return catalog;
    }

    function buildSubscriptionCard(subscription) {
        var offers = Array.isArray(subscription.offers) ? subscription.offers : [];
        var offerIcons = subscription.offer_icons || frontendCatalog[subscription.brand_key] && frontendCatalog[subscription.brand_key].offer_icons || [];
        var expires = new Date(subscription.expires_at);
        var expiresLabel = isNaN(expires.getTime())
            ? (subscription.duration_label || '1 Month')
            : expires.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });

        var listItems = offers.map(function (offer, idx) {
            var icon = offerIcons[idx] || './img/loyalty/serving-food.svg';
            return '<li><img src="' + escapeHtml(icon) + '" alt="" aria-hidden="true"><span>' + escapeHtml(offer) + '</span></li>';
        }).join('');

        if (!listItems) {
            listItems = '<li><img src="./img/loyalty/serving-food.svg" alt="" aria-hidden="true"><span>None</span></li>';
        }

        return [
            '<article class="subscription-card" data-brand-key="' + escapeHtml(subscription.brand_key) + '" aria-label="' + escapeHtml(subscription.brand_name) + ' subscription">',
            '  <div class="subscription-card-head">',
            '    <div class="subscription-brand-logo"><img src="' + escapeHtml(subscription.brand_logo) + '" alt="' + escapeHtml(subscription.brand_name) + ' logo"></div>',
            '    <div class="subscription-head-copy">',
            '      <p class="subscription-brand-name">' + escapeHtml(subscription.brand_name) + '</p>',
            '      <div class="subscription-meta-row">',
            '        <p class="subscription-tier">' + escapeHtml(subscription.tier_plan || currentLoyalty.tier || 'Silver') + '</p>',
            '        <div class="subscription-date-wrap">',
            '          <img src="./img/loyalty/clock-04.svg" alt="" aria-hidden="true">',
            '          <p class="subscription-date">' + escapeHtml(expiresLabel) + '</p>',
            '        </div>',
            '      </div>',
            '    </div>',
            '  </div>',
            '  <div class="subscription-offers-block">',
            '    <p class="subscription-offers-title">Offers:</p>',
            '    <ul class="subscription-offer-list" aria-label="' + escapeHtml(subscription.brand_name) + ' offers">' + listItems + '</ul>',
            '  </div>',
            '  <button class="subscription-details-btn" type="button"><span>Details</span><img src="./img/loyalty/arrow-up-01.svg" alt="" aria-hidden="true"></button>',
            '</article>'
        ].join('');
    }

    function renderActiveSubscriptions(subscriptions) {
        if (!activeSubscriptionGrid) return;
        if (!subscriptions || !subscriptions.length) {
            activeSubscriptionGrid.innerHTML = [
                '<article class="subscription-card subscription-card-empty" aria-label="No active subscriptions">',
                '  <div class="subscription-empty-state">',
                '    <p class="subscription-empty-title">No active subscription yet</p>',
                '    <p class="subscription-empty-copy">Redeem a cafe plan with your points and it will appear here.</p>',
                '  </div>',
                '</article>'
            ].join('');
            return;
        }

        activeSubscriptionGrid.innerHTML = subscriptions.map(function (item) {
            return buildSubscriptionCard(item);
        }).join('');
    }

    function formatDateLabel(dateValue) {
        var dt = new Date(dateValue || '');
        if (isNaN(dt.getTime())) return '—';
        return dt.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    function formatShortDateLabel(dateValue) {
        var dt = new Date(dateValue || '');
        if (isNaN(dt.getTime())) return '—';
        return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    }

    function computeInsightSummary() {
        var list = Object.keys(activeSubscriptionsByKey).map(function (k) { return activeSubscriptionsByKey[k]; });
        var count = list.length;
        var main = document.querySelector('.tier-insight-main');
        var sub = document.querySelector('.tier-insight-sub');
        if (!main || !sub) return;

        if (count < 1) {
            main.textContent = 'Subscriptions: 0';
            sub.textContent = 'No active subscription yet';
            return;
        }

        var nearest = null;
        list.forEach(function (item) {
            var expires = new Date(item.expires_at || '');
            if (isNaN(expires.getTime())) return;
            if (!nearest || expires.getTime() < nearest.getTime()) nearest = expires;
        });

        main.textContent = 'Subscriptions: ' + count;
        if (!nearest) {
            sub.textContent = 'Active plan details are available now';
            return;
        }

        var now = new Date();
        var daysLeft = Math.max(0, Math.ceil((nearest.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        sub.textContent = daysLeft === 0 ? 'Expires today' : ('Expire in ' + daysLeft + ' day' + (daysLeft > 1 ? 's' : ''));
    }

    function buildRedeemRow(item, isActive, hasEnoughPoints) {
        var stateLabel = isActive ? 'Active' : (hasEnoughPoints ? String(item.points_cost) : 'Locked');
        var disabledAttr = isActive || !hasEnoughPoints ? ' disabled' : '';
        var disabledClass = isActive || !hasEnoughPoints ? ' is-disabled' : '';

        return [
            '<article class="redeem-row" data-brand-key="' + escapeHtml(item.brand_key) + '" aria-label="Redeem ' + escapeHtml(item.brand_name) + '">',
            '  <div class="redeem-notch redeem-notch-left" aria-hidden="true"><img src="./img/loyalty/redeem-notch-left-2.svg" alt=""></div>',
            '  <div class="redeem-card">',
            '    <div class="redeem-main">',
            '      <div class="redeem-brand-logo"><img src="' + escapeHtml(item.brand_logo) + '" alt="' + escapeHtml(item.brand_name) + ' logo"></div>',
            '      <div class="redeem-head-copy">',
            '        <p class="redeem-brand-name">' + escapeHtml(item.brand_name) + '</p>',
            '        <div class="redeem-meta-row">',
            '          <p class="redeem-tier">' + escapeHtml(item.tier_plan || currentLoyalty.tier || 'Silver') + '</p>',
            '          <div class="redeem-time-wrap">',
            '            <img src="./img/loyalty/clock-04.svg" alt="" aria-hidden="true">',
            '            <p class="redeem-time">' + escapeHtml(item.duration_label || '1 Month') + '</p>',
            '          </div>',
            '        </div>',
            '      </div>',
            '    </div>',
            '    <button class="redeem-points-btn' + disabledClass + '" type="button" data-brand-key="' + escapeHtml(item.brand_key) + '" aria-label="Redeem for ' + escapeHtml(String(item.points_cost)) + ' points"' + disabledAttr + '>',
            '      <img src="./img/loyalty/coins-02.svg" alt="" aria-hidden="true">',
            '      <span>' + escapeHtml(stateLabel) + '</span>',
            '    </button>',
            '  </div>',
            '  <div class="redeem-notch redeem-notch-right" aria-hidden="true"><img src="./img/loyalty/redeem-notch-right.svg" alt=""></div>',
            '</article>'
        ].join('');
    }

    function renderRedeemList(catalog, activeMap) {
        if (!redeemList) return;
        var balance = Number(currentLoyalty.points_balance || 0);
        redeemList.innerHTML = catalog.map(function (item) {
            var isActive = !!activeMap[item.brand_key];
            var hasEnough = balance >= Number(item.points_cost || 0);
            return buildRedeemRow(item, isActive, hasEnough);
        }).join('');
    }

    function createRedeemModal() {
        var root = document.createElement('div');
        root.className = 'redeem-modal-overlay';
        root.innerHTML = [
            '<div class="redeem-modal" role="dialog" aria-modal="true" aria-label="Confirm redeem">',
            '  <button type="button" class="redeem-modal-close" aria-label="Close">&times;</button>',
            '  <div class="redeem-modal-head">',
            '    <img class="redeem-modal-logo" src="" alt="">',
            '    <div class="redeem-modal-head-copy">',
            '      <p class="redeem-modal-tier"></p>',
            '      <h3 class="redeem-modal-title"></h3>',
            '      <p class="redeem-modal-duration"></p>',
            '    </div>',
            '  </div>',
            '  <div class="redeem-modal-offers">',
            '    <p class="redeem-modal-offers-title">My Offer:</p>',
            '    <ul class="redeem-modal-offer-list"></ul>',
            '  </div>',
            '  <div class="redeem-modal-summary">',
            '    <p><strong>Cost:</strong> <span class="redeem-modal-cost"></span> points</p>',
            '    <p><strong>Balance After Redeem:</strong> <span class="redeem-modal-balance-after"></span> points</p>',
            '  </div>',
            '  <div class="redeem-modal-actions">',
            '    <button type="button" class="redeem-modal-btn redeem-modal-btn-cancel">Cancel</button>',
            '    <button type="button" class="redeem-modal-btn redeem-modal-btn-confirm">Confirm</button>',
            '  </div>',
            '</div>'
        ].join('');

        document.body.appendChild(root);

        root.querySelector('.redeem-modal-close').addEventListener('click', closeRedeemModal);
        root.querySelector('.redeem-modal-btn-cancel').addEventListener('click', closeRedeemModal);
        root.addEventListener('click', function (e) {
            if (e.target === root) closeRedeemModal();
        });
        root.querySelector('.redeem-modal-btn-confirm').addEventListener('click', function () {
            if (!redeemModalState.brandKey) return;
            redeemSubscription(redeemModalState.brandKey);
        });

        return root;
    }

    function createSubscriptionDetailsModal() {
        var root = document.createElement('div');
        root.className = 'redeem-modal-overlay subscription-details-overlay';
        root.innerHTML = [
            '<div class="redeem-modal subscription-details-modal" role="dialog" aria-modal="true" aria-label="Subscription details">',
            '  <div class="redeem-modal-head">',
            '    <img class="redeem-modal-logo" src="" alt="">',
            '    <div class="redeem-modal-head-copy">',
            '      <h3 class="redeem-modal-title"></h3>',
            '      <div class="subscription-detail-top-meta">',
            '        <p class="subscription-detail-tier"></p>',
            '        <div class="subscription-detail-expiry">',
            '          <img src="./img/loyalty/clock-04.svg" alt="" aria-hidden="true">',
            '          <span class="subscription-detail-top-date">—</span>',
            '        </div>',
            '      </div>',
            '    </div>',
            '  </div>',
            '  <div class="redeem-modal-offers">',
            '    <p class="redeem-modal-offers-title">Offers:</p>',
            '    <ul class="redeem-modal-offer-list"></ul>',
            '  </div>',
            '  <p class="subscription-detail-status"><strong>Status:</strong><span class="subscription-detail-status-value">Active</span></p>',
            '  <div class="subscription-detail-dates">',
            '    <div class="subscription-detail-date-item">',
            '      <p class="subscription-detail-date-label">Start Date</p>',
            '      <p class="subscription-detail-date-value subscription-detail-start">—</p>',
            '    </div>',
            '    <div class="subscription-detail-date-item">',
            '      <p class="subscription-detail-date-label">End Date</p>',
            '      <p class="subscription-detail-date-value subscription-detail-end">—</p>',
            '    </div>',
            '  </div>',
            '  <div class="redeem-modal-actions">',
            '    <button type="button" class="redeem-modal-btn redeem-modal-btn-cancel subscription-detail-close">Close</button>',
            '    <button type="button" class="redeem-modal-btn redeem-modal-btn-confirm subscription-detail-cancel">Cancel</button>',
            '  </div>',
            '</div>'
        ].join('');

        document.body.appendChild(root);

        root.querySelector('.subscription-detail-close').addEventListener('click', closeSubscriptionDetailsModal);
        root.addEventListener('click', function (e) {
            if (e.target === root) closeSubscriptionDetailsModal();
        });
        root.querySelector('.subscription-detail-cancel').addEventListener('click', function () {
            if (!subscriptionDetailsState.subscriptionId) return;
            cancelSubscription(subscriptionDetailsState.subscriptionId);
        });

        return root;
    }

    function openSubscriptionDetailsModal(subscription) {
        if (!subscription) return;
        if (!subscriptionDetailsModal) subscriptionDetailsModal = createSubscriptionDetailsModal();

        subscriptionDetailsState.subscriptionId = Number(subscription.id || 0);

        var logo = subscriptionDetailsModal.querySelector('.redeem-modal-logo');
        logo.src = subscription.brand_logo || '';
        logo.alt = (subscription.brand_name || 'Subscription') + ' logo';

        subscriptionDetailsModal.querySelector('.subscription-detail-tier').textContent = subscription.tier_plan || currentLoyalty.tier || 'Silver';
        subscriptionDetailsModal.querySelector('.redeem-modal-title').textContent = subscription.brand_name || 'Subscription';
        subscriptionDetailsModal.querySelector('.subscription-detail-top-date').textContent = formatShortDateLabel(subscription.expires_at);
        subscriptionDetailsModal.querySelector('.subscription-detail-start').textContent = formatDateLabel(subscription.created_at);
        subscriptionDetailsModal.querySelector('.subscription-detail-end').textContent = formatDateLabel(subscription.expires_at);
        subscriptionDetailsModal.querySelector('.subscription-detail-status-value').textContent = 'Active';

        var offers = Array.isArray(subscription.offers) ? subscription.offers : [];
        var offerIcons = subscription.offer_icons || ['./img/loyalty/drink.svg', './img/loyalty/natural-food.svg', './img/loyalty/serving-food.svg'];
        var offersHtml = offers.map(function (offer, idx) {
            var icon = offerIcons[idx] || './img/loyalty/serving-food.svg';
            return '<li><img src="' + escapeHtml(icon) + '" alt="" aria-hidden="true"><span>' + escapeHtml(offer) + '</span></li>';
        }).join('');
        subscriptionDetailsModal.querySelector('.redeem-modal-offer-list').innerHTML = offersHtml || '<li><img src="./img/loyalty/serving-food.svg" alt="" aria-hidden="true"><span>No offer found.</span></li>';

        subscriptionDetailsModal.classList.add('is-open');
    }

    function closeSubscriptionDetailsModal() {
        if (!subscriptionDetailsModal) return;
        subscriptionDetailsModal.classList.remove('is-open');
        subscriptionDetailsState.subscriptionId = 0;
    }

    function formatHistoryDate(dateValue) {
        var dt = new Date(dateValue || '');
        if (isNaN(dt.getTime())) return 'Date unavailable';
        return dt.toLocaleString('en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function createPointsHistoryModal() {
        var root = document.createElement('div');
        root.className = 'redeem-modal-overlay points-history-overlay';
        root.innerHTML = [
            '<div class="redeem-modal points-history-modal" role="dialog" aria-modal="true" aria-label="Points history">',
            '  <button type="button" class="redeem-modal-close" aria-label="Close">&times;</button>',
            '  <div class="redeem-modal-head">',
            '    <div class="redeem-modal-head-copy">',
            '      <p class="redeem-modal-tier">Loyalty points</p>',
            '      <h3 class="redeem-modal-title">Points Usage History</h3>',
            '      <p class="redeem-modal-duration">Track your earned and redeemed points.</p>',
            '    </div>',
            '  </div>',
            '  <div class="points-history-summary">',
            '    <div class="points-history-stat">',
            '      <p class="points-history-stat-label">Total Earned</p>',
            '      <p class="points-history-stat-value points-history-total-earned">0</p>',
            '    </div>',
            '    <div class="points-history-stat">',
            '      <p class="points-history-stat-label">Total Used</p>',
            '      <p class="points-history-stat-value points-history-total-used">0</p>',
            '    </div>',
            '    <div class="points-history-stat">',
            '      <p class="points-history-stat-label">Current Balance</p>',
            '      <p class="points-history-stat-value points-history-total-balance">0</p>',
            '    </div>',
            '  </div>',
            '  <div class="redeem-modal-offers">',
            '    <p class="redeem-modal-offers-title">History Details</p>',
            '    <ul class="points-history-list points-history-list-root"></ul>',
            '  </div>',
            '  <div class="redeem-modal-actions">',
            '    <button type="button" class="redeem-modal-btn redeem-modal-btn-cancel points-history-close">Close</button>',
            '  </div>',
            '</div>'
        ].join('');

        document.body.appendChild(root);

        root.querySelector('.redeem-modal-close').addEventListener('click', closePointsHistoryModal);
        root.querySelector('.points-history-close').addEventListener('click', closePointsHistoryModal);
        root.addEventListener('click', function (event) {
            if (event.target === root) closePointsHistoryModal();
        });

        return root;
    }

    function renderPointsHistoryModal() {
        if (!pointsHistoryModal) return;

        var totals = pointsHistoryState.totals || {};
        pointsHistoryModal.querySelector('.points-history-total-earned').textContent = formatPoints(totals.earned || 0);
        pointsHistoryModal.querySelector('.points-history-total-used').textContent = formatPoints(totals.used || 0);
        pointsHistoryModal.querySelector('.points-history-total-balance').textContent = formatPoints(totals.balance || 0);

        var listRoot = pointsHistoryModal.querySelector('.points-history-list-root');
        var entries = Array.isArray(pointsHistoryState.entries) ? pointsHistoryState.entries : [];

        if (!entries.length) {
            listRoot.innerHTML = '<li class="points-history-item"><div class="points-history-item-copy"><p class="points-history-item-title">No points history yet</p><p class="points-history-item-meta">Your payment and redeem activity will appear here.</p></div></li>';
            return;
        }

        listRoot.innerHTML = entries.map(function (entry) {
            var type = String(entry.type || '').toLowerCase() === 'used' ? 'used' : 'earned';
            var sign = type === 'used' ? '-' : '+';
            var points = Math.max(0, Number(entry.points || 0));
            var title = escapeHtml(entry.title || (type === 'used' ? 'Points used' : 'Points earned'));
            var subtitle = escapeHtml(entry.subtitle || '');
            var reference = escapeHtml(entry.reference || '');
            var meta = escapeHtml(entry.meta || '');
            var occurredAt = escapeHtml(formatHistoryDate(entry.occurred_at));

            return [
                '<li class="points-history-item points-history-item-' + type + '">',
                '  <div class="points-history-item-copy">',
                '    <p class="points-history-item-title">' + title + '</p>',
                '    <p class="points-history-item-meta">' + subtitle + (reference ? ' | ' + reference : '') + '</p>',
                '    <p class="points-history-item-meta">' + meta + (meta ? ' | ' : '') + occurredAt + '</p>',
                '  </div>',
                '  <p class="points-history-item-points">' + sign + formatPoints(points) + '</p>',
                '</li>'
            ].join('');
        }).join('');
    }

    function openPointsHistoryModal() {
        if (!pointsHistoryModal) pointsHistoryModal = createPointsHistoryModal();
        renderPointsHistoryModal();
        pointsHistoryModal.classList.add('is-open');
    }

    function closePointsHistoryModal() {
        if (!pointsHistoryModal) return;
        pointsHistoryModal.classList.remove('is-open');
    }

    function openRedeemModal(item) {
        if (!redeemModal) redeemModal = createRedeemModal();

        redeemModalState.brandKey = item.brand_key;

        var logo = redeemModal.querySelector('.redeem-modal-logo');
        logo.src = item.brand_logo;
        logo.alt = item.brand_name + ' logo';

        redeemModal.querySelector('.redeem-modal-tier').textContent = (currentLoyalty.tier || 'Silver') + ' plan';
        redeemModal.querySelector('.redeem-modal-title').textContent = item.brand_name;
        redeemModal.querySelector('.redeem-modal-duration').textContent = item.duration_label || '1 Month';

        var offers = Array.isArray(item.offers) ? item.offers : [];
        var offerIcons = item.offer_icons || ['./img/loyalty/drink.svg', './img/loyalty/natural-food.svg', './img/loyalty/serving-food.svg'];
        var offersHtml = offers.map(function (offer, idx) {
            var icon = offerIcons[idx] || './img/loyalty/serving-food.svg';
            return '<li><img src="' + escapeHtml(icon) + '" alt="" aria-hidden="true"><span>' + escapeHtml(offer) + '</span></li>';
        }).join('');
        redeemModal.querySelector('.redeem-modal-offer-list').innerHTML = offersHtml;

        var cost = Number(item.points_cost || 0);
        var after = Math.max(0, Number(currentLoyalty.points_balance || 0) - cost);
        redeemModal.querySelector('.redeem-modal-cost').textContent = formatPoints(cost);
        redeemModal.querySelector('.redeem-modal-balance-after').textContent = formatPoints(after);

        redeemModal.classList.add('is-open');
    }

    function closeRedeemModal() {
        if (!redeemModal) return;
        redeemModal.classList.remove('is-open');
        redeemModalState.brandKey = '';
    }

    function mergeCatalog(apiCatalog) {
        return (apiCatalog || []).map(function (item) {
            var front = frontendCatalog[item.brand_key] || {};
            return {
                brand_key: item.brand_key,
                brand_name: front.brand_name || item.brand_name,
                brand_logo: front.brand_logo || item.brand_logo,
                tier_plan: front.tier_plan || currentLoyalty.tier || 'Silver',
                duration_label: front.duration_label || item.duration_label || '1 Month',
                points_cost: Number(item.points_cost || front.points_cost || 600),
                monthly_price: Number(item.monthly_price || front.monthly_price || 45),
                offers: (item.offers && item.offers.length ? item.offers : front.offers) || ['None'],
                offer_icons: front.offer_icons || ['./img/loyalty/drink.svg', './img/loyalty/natural-food.svg', './img/loyalty/serving-food.svg']
            };
        });
    }

    function loadSubscriptions() {
        return fetch('../api/subscriptions.php', { credentials: 'include' })
            .then(readLoyaltyResponse)
            .then(function (data) {
                if (!data.success) return;

                if (data.loyalty) {
                    currentLoyalty.points_balance = Number(data.loyalty.points_balance || 0);
                    currentLoyalty.total_earned = Number(data.loyalty.points_earned || 0);
                    currentLoyalty.tier = data.loyalty.tier || currentLoyalty.tier || 'Silver';
                }

                var catalog = mergeCatalog(data.catalog || []);
                currentCatalog = catalog;

                var active = Array.isArray(data.active_subscriptions) ? data.active_subscriptions : [];
                activeSubscriptionsByKey = {};
                active.forEach(function (item) {
                    var merged = Object.assign({}, frontendCatalog[item.brand_key] || {}, item);
                    if (!Array.isArray(merged.offers) || !merged.offers.length) {
                        merged.offers = (frontendCatalog[item.brand_key] && frontendCatalog[item.brand_key].offers) || ['None'];
                    }
                    merged.offer_icons = (frontendCatalog[item.brand_key] && frontendCatalog[item.brand_key].offer_icons) || ['./img/loyalty/drink.svg', './img/loyalty/natural-food.svg', './img/loyalty/serving-food.svg'];
                    merged.tier_plan = item.tier_plan || currentLoyalty.tier || 'Silver';
                    merged.duration_label = item.duration_label || '1 Month';
                    activeSubscriptionsByKey[item.brand_key] = merged;
                });

                renderActiveSubscriptions(Object.keys(activeSubscriptionsByKey).map(function (k) { return activeSubscriptionsByKey[k]; }));
                renderRedeemList(catalog, activeSubscriptionsByKey);
                computeInsightSummary();
            })
            .catch(function () {
                renderActiveSubscriptions([]);
                currentCatalog = Object.values(frontendCatalog);
                renderRedeemList(currentCatalog, {});
                computeInsightSummary();
            });
    }

    function cancelSubscription(subscriptionId) {
        if (!subscriptionId) return;
        if (!window.confirm('Are you sure you want to cancel this subscription?')) return;

        var cancelBtn = subscriptionDetailsModal ? subscriptionDetailsModal.querySelector('.subscription-detail-cancel') : null;
        if (cancelBtn && cancelBtn.disabled) return;
        if (cancelBtn) {
            cancelBtn.disabled = true;
            cancelBtn.textContent = 'Cancelling…';
        }

        var finishCancelRequest = function () {
            if (cancelBtn) {
                cancelBtn.disabled = false;
                cancelBtn.textContent = 'Cancel';
            }
        };

        fetch('../api/subscriptions.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ action: 'cancel', subscription_id: subscriptionId })
        })
            .then(readLoyaltyResponse)
            .then(function (data) {
                finishCancelRequest();
                if (!data.success) {
                    alert(data.message || 'Could not cancel subscription.');
                    return;
                }
                closeSubscriptionDetailsModal();
                loadSubscriptions();
            })
            .catch(function () {
                finishCancelRequest();
                alert('Could not cancel subscription. Please try again.');
            });
    }

    function redeemSubscription(brandKey) {
        if (!brandKey || redeemInFlight) return;

        var confirmBtn = redeemModal ? redeemModal.querySelector('.redeem-modal-btn-confirm') : null;
        redeemInFlight = true;
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Processing…';
        }

        var finishRedeemRequest = function () {
            redeemInFlight = false;
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Confirm';
            }
        };

        fetch('../api/subscriptions.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ action: 'redeem', brand_key: brandKey })
        })
            .then(readLoyaltyResponse)
            .then(function (data) {
                finishRedeemRequest();
                if (!data.success) {
                    var msg = data.message || 'Redeem failed.';
                    if (data.error_detail) {
                        msg += '\n' + data.error_detail;
                    }
                    alert(msg);
                    return;
                }

                closeRedeemModal();
                if (data.loyalty) {
                    currentLoyalty.points_balance = Number(data.loyalty.points_balance || 0);
                    currentLoyalty.total_earned = Number(data.loyalty.points_earned || 0);
                    currentLoyalty.tier = data.loyalty.tier || currentLoyalty.tier || 'Silver';
                    applyLoyaltyState(currentLoyalty);
                }
                loadLoyalty().then(loadSubscriptions);
            })
            .catch(function () {
                finishRedeemRequest();
                alert('Could not redeem subscription. Please try again.');
            });
    }

    if (redeemList) {
        redeemList.addEventListener('click', function (event) {
            var button = event.target.closest('.redeem-points-btn');
            if (!button || button.disabled) return;
            var brandKey = button.getAttribute('data-brand-key');
            var sourceCatalog = currentCatalog && currentCatalog.length ? currentCatalog : mergeCatalog(Object.values(frontendCatalog));
            var catalogItem = sourceCatalog.find(function (item) {
                return item.brand_key === brandKey;
            });

            if (!catalogItem) return;
            openRedeemModal(catalogItem);
        });
    }

    if (activeSubscriptionGrid) {
        activeSubscriptionGrid.addEventListener('click', function (event) {
            var detailsBtn = event.target.closest('.subscription-details-btn');
            if (!detailsBtn) return;
            var card = detailsBtn.closest('.subscription-card');
            if (!card) return;

            var brandKey = card.getAttribute('data-brand-key') || '';
            var item = activeSubscriptionsByKey[brandKey];
            if (!item) return;
            openSubscriptionDetailsModal(item);
        });
    }

    var openPointsHistoryBtn = document.getElementById('openPointsHistoryBtn');
    if (openPointsHistoryBtn) {
        openPointsHistoryBtn.addEventListener('click', function () {
            openPointsHistoryModal();
        });
    }

    function loadLoyalty() {
        return fetch('../api/loyalty.php', { credentials: 'include' })
            .then(readLoyaltyResponse)
            .then(function (data) {
                if (!data.success || !data.loyalty) {
                    currentLoyalty = { points_balance: 0, total_earned: 0, tier: 'Silver' };
                    applyLoyaltyState(currentLoyalty);
                    return;
                }
                currentLoyalty = {
                    points_balance: Number(data.loyalty.points_balance || 0),
                    total_earned: Number(data.loyalty.total_earned || 0),
                    tier: data.loyalty.tier || 'Silver'
                };

                if (data.loyalty.history) {
                    pointsHistoryState.totals = {
                        earned: Number(data.loyalty.history.totals && data.loyalty.history.totals.earned || 0),
                        used: Number(data.loyalty.history.totals && data.loyalty.history.totals.used || 0),
                        balance: Number(data.loyalty.history.totals && data.loyalty.history.totals.balance || currentLoyalty.points_balance || 0),
                        count: Number(data.loyalty.history.totals && data.loyalty.history.totals.count || 0)
                    };
                    pointsHistoryState.entries = Array.isArray(data.loyalty.history.entries) ? data.loyalty.history.entries : [];
                } else {
                    pointsHistoryState.totals = {
                        earned: Number(currentLoyalty.total_earned || 0),
                        used: Math.max(0, Number(currentLoyalty.total_earned || 0) - Number(currentLoyalty.points_balance || 0)),
                        balance: Number(currentLoyalty.points_balance || 0),
                        count: 0
                    };
                    pointsHistoryState.entries = [];
                }

                applyLoyaltyState(currentLoyalty);
            })
            .catch(function () {
                currentLoyalty = { points_balance: 0, total_earned: 0, tier: 'Silver' };
                pointsHistoryState = {
                    totals: { earned: 0, used: 0, balance: 0, count: 0 },
                    entries: []
                };
                applyLoyaltyState(currentLoyalty);
            });
    }

    prevButton.addEventListener('click', function () {
        prev();
        resetAutoSlide();
    });

    nextButton.addEventListener('click', function () {
        next();
        resetAutoSlide();
    });

    sliderWindow.addEventListener('keydown', function (event) {
        if (event.key === 'ArrowRight') {
            next();
            resetAutoSlide();
        }
        if (event.key === 'ArrowLeft') {
            prev();
            resetAutoSlide();
        }
    });

    slider.addEventListener('mouseenter', stopAutoSlide);
    slider.addEventListener('mouseleave', startAutoSlide);
    slider.addEventListener('focusin', stopAutoSlide);
    slider.addEventListener('focusout', startAutoSlide);

    createDots();
    updateUI();
    loadLoyalty().then(loadSubscriptions);
    startAutoSlide();
});