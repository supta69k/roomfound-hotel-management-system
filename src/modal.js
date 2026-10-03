// ===== RoomFound Design-System Modal =====
// Reusable modal: success, error, confirm, prompt
(function () {
  // Inject modal styles once
  var style = document.createElement('style');
  style.textContent = [
    /* Overlay */
    '.rf-modal-overlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(20,28,33,0.45);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;transition:opacity .25s ease;}',
    '.rf-modal-overlay.rf-show{opacity:1;}',

    /* Card */
    '.rf-modal{background:#fff;border-radius:20px;width:420px;max-width:90vw;padding:40px 36px 32px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.18);transform:scale(0.9) translateY(12px);transition:transform .3s cubic-bezier(.175,.885,.32,1.275),opacity .25s ease;opacity:0;}',
    '.rf-modal-overlay.rf-show .rf-modal{transform:scale(1) translateY(0);opacity:1;}',

    /* Icon ring */
    '.rf-modal-icon{width:64px;height:64px;border-radius:50%;margin:0 auto 22px;display:flex;align-items:center;justify-content:center;}',
    '.rf-modal-icon svg{width:30px;height:30px;}',
    '.rf-modal-icon.rf-success{background:#e6f4ef;}',
    '.rf-modal-icon.rf-error{background:#f0eaea;}',
    '.rf-modal-icon.rf-confirm{background:#e8edef;}',
    '.rf-modal-icon.rf-prompt{background:#e8f0f3;}',

    /* Title */
    '.rf-modal-title{font-family:ABeeZee,sans-serif;font-size:20px;color:#1e2e37;margin:0 0 10px;letter-spacing:-0.43px;}',

    /* Message */
    '.rf-modal-msg{font-family:Inter,sans-serif;font-size:14px;color:#666;line-height:1.6;margin:0 0 28px;}',

    /* Input (prompt) */
    '.rf-modal-input{width:100%;box-sizing:border-box;font-family:Inter,sans-serif;font-size:14px;color:#333;border:1.5px solid #ddd;border-radius:12px;padding:12px 16px;outline:none;margin:0 0 24px;transition:border-color .15s;}',
    '.rf-modal-input:focus{border-color:#5bb5a2;}',
    '.rf-modal-input::placeholder{color:#bbb;}',

    /* Textarea (review) */
    '.rf-modal-textarea{width:100%;box-sizing:border-box;resize:vertical;min-height:120px;font-family:Inter,sans-serif;font-size:14px;color:#333;border:1.5px solid #ddd;border-radius:12px;padding:12px 16px;outline:none;margin:0 0 16px;transition:border-color .15s;}',
    '.rf-modal-textarea:focus{border-color:#5bb5a2;}',
    '.rf-modal-textarea::placeholder{color:#bbb;}',

    /* Review stars */
    '.rf-modal-rating-row{display:flex;align-items:center;justify-content:center;gap:8px;margin:0 0 16px;}',
    '.rf-modal-star-btn{border:none;background:transparent;cursor:pointer;padding:0;line-height:1;}',
    '.rf-modal-star-btn svg{width:24px;height:24px;display:block;fill:#d7d7d7;transition:transform .12s ease,fill .12s ease;}',
    '.rf-modal-star-btn.is-active svg{fill:#FFB800;}',
    '.rf-modal-star-btn:hover svg{transform:scale(1.08);}',
    '.rf-modal-helper{font-family:Inter,sans-serif;font-size:12px;color:#98979b;line-height:1.4;margin:0 0 10px;text-align:left;}',

    /* Buttons row */
    '.rf-modal-btns{display:flex;gap:10px;justify-content:center;}',

    /* Primary button — dark gradient */
    '.rf-modal-btn-primary{font-family:Inter,sans-serif;font-size:14px;font-weight:500;color:#fff;border:none;border-radius:12px;padding:12px 32px;cursor:pointer;background:linear-gradient(119deg,#3f3f3f 18%,#151515 77%);box-shadow:inset 0 4px 12px #081738;transition:opacity .15s,transform .1s;}',
    '.rf-modal-btn-primary:hover{opacity:0.92;}',
    '.rf-modal-btn-primary:active{transform:scale(0.97);}',

    /* Secondary button */
    '.rf-modal-btn-secondary{font-family:Inter,sans-serif;font-size:14px;font-weight:500;color:#666;border:1.5px solid #ddd;border-radius:12px;padding:12px 32px;cursor:pointer;background:#fff;transition:all .15s;}',
    '.rf-modal-btn-secondary:hover{border-color:#1e2e37;color:#1e2e37;}',
    '.rf-modal-btn-secondary:active{transform:scale(0.97);}',

    /* Green accent button */
    '.rf-modal-btn-green{font-family:Inter,sans-serif;font-size:14px;font-weight:500;color:#fff;border:none;border-radius:12px;padding:12px 32px;cursor:pointer;background:#1e2e37;transition:opacity .15s,transform .1s;}',
    '.rf-modal-btn-green:hover{opacity:0.88;}',
    '.rf-modal-btn-green:active{transform:scale(0.97);}',

    /* Cancel / danger tint */
    '.rf-modal-btn-danger{font-family:Inter,sans-serif;font-size:14px;font-weight:500;color:#fff;border:none;border-radius:12px;padding:12px 32px;cursor:pointer;background:#8b5e5e;transition:opacity .15s,transform .1s;}',
    '.rf-modal-btn-danger:hover{opacity:0.88;}',
    '.rf-modal-btn-danger:active{transform:scale(0.97);}'
  ].join('\n');
  document.head.appendChild(style);

  // SVG icons
  var icons = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="#3d8b6e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="#8b5e5e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    confirm: '<svg viewBox="0 0 24 24" fill="none" stroke="#1e2e37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    prompt: '<svg viewBox="0 0 24 24" fill="none" stroke="#3a5a6a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    review: '<svg viewBox="0 0 24 24" fill="none" stroke="#3a5a6a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h8"/><path d="M8 7h8"/></svg>'
  };

  // Remove modal with animation
  function closeModal(overlay) {
    overlay.classList.remove('rf-show');
    setTimeout(function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 280);
  }

  // Build overlay + card
  function createOverlay() {
    var overlay = document.createElement('div');
    overlay.className = 'rf-modal-overlay';
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal(overlay);
    });
    return overlay;
  }

  /**
   * window.rfModal.success({ title, message, btnText, onClose })
   */
  function showSuccess(opts) {
    opts = opts || {};
    var overlay = createOverlay();
    var card = document.createElement('div');
    card.className = 'rf-modal';
    card.innerHTML =
      '<div class="rf-modal-icon rf-success">' + icons.success + '</div>' +
      '<div class="rf-modal-title">' + (opts.title || 'Success!') + '</div>' +
      '<div class="rf-modal-msg">' + (opts.message || '') + '</div>' +
      '<div class="rf-modal-btns"><button class="rf-modal-btn-primary rf-ok">' + (opts.btnText || 'Done') + '</button></div>';
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add('rf-show'); });

    card.querySelector('.rf-ok').addEventListener('click', function () {
      closeModal(overlay);
      if (opts.onClose) opts.onClose();
    });
  }

  /**
   * window.rfModal.error({ title, message, btnText, onClose })
   */
  function showError(opts) {
    opts = opts || {};
    var overlay = createOverlay();
    var card = document.createElement('div');
    card.className = 'rf-modal';
    card.innerHTML =
      '<div class="rf-modal-icon rf-error">' + icons.error + '</div>' +
      '<div class="rf-modal-title">' + (opts.title || 'Something went wrong') + '</div>' +
      '<div class="rf-modal-msg">' + (opts.message || '') + '</div>' +
      '<div class="rf-modal-btns"><button class="rf-modal-btn-primary rf-ok">' + (opts.btnText || 'OK') + '</button></div>';
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add('rf-show'); });

    card.querySelector('.rf-ok').addEventListener('click', function () {
      closeModal(overlay);
      if (opts.onClose) opts.onClose();
    });
  }

  /**
   * window.rfModal.confirm({ title, message, confirmText, cancelText, onConfirm, onCancel, danger })
   */
  function showConfirm(opts) {
    opts = opts || {};
    var overlay = createOverlay();
    var card = document.createElement('div');
    card.className = 'rf-modal';
    var confirmBtnClass = opts.danger ? 'rf-modal-btn-danger' : 'rf-modal-btn-primary';
    card.innerHTML =
      '<div class="rf-modal-icon rf-confirm">' + icons.confirm + '</div>' +
      '<div class="rf-modal-title">' + (opts.title || 'Are you sure?') + '</div>' +
      '<div class="rf-modal-msg">' + (opts.message || '') + '</div>' +
      '<div class="rf-modal-btns">' +
        '<button class="rf-modal-btn-secondary rf-cancel">' + (opts.cancelText || 'Cancel') + '</button>' +
        '<button class="' + confirmBtnClass + ' rf-confirm-btn">' + (opts.confirmText || 'Confirm') + '</button>' +
      '</div>';
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add('rf-show'); });

    card.querySelector('.rf-confirm-btn').addEventListener('click', function () {
      closeModal(overlay);
      if (opts.onConfirm) opts.onConfirm();
    });
    card.querySelector('.rf-cancel').addEventListener('click', function () {
      closeModal(overlay);
      if (opts.onCancel) opts.onCancel();
    });
  }

  /**
   * window.rfModal.prompt({ title, message, placeholder, confirmText, cancelText, onSubmit, onCancel })
   */
  function showPrompt(opts) {
    opts = opts || {};
    var overlay = createOverlay();
    var card = document.createElement('div');
    card.className = 'rf-modal';
    card.innerHTML =
      '<div class="rf-modal-icon rf-prompt">' + icons.prompt + '</div>' +
      '<div class="rf-modal-title">' + (opts.title || 'Enter details') + '</div>' +
      '<div class="rf-modal-msg">' + (opts.message || '') + '</div>' +
      '<input class="rf-modal-input rf-input" type="text" placeholder="' + (opts.placeholder || '') + '">' +
      '<div class="rf-modal-btns">' +
        '<button class="rf-modal-btn-secondary rf-cancel">' + (opts.cancelText || 'Skip') + '</button>' +
        '<button class="rf-modal-btn-primary rf-submit">' + (opts.confirmText || 'Submit') + '</button>' +
      '</div>';
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    requestAnimationFrame(function () {
      overlay.classList.add('rf-show');
      card.querySelector('.rf-input').focus();
    });

    card.querySelector('.rf-submit').addEventListener('click', function () {
      var val = card.querySelector('.rf-input').value;
      closeModal(overlay);
      if (opts.onSubmit) opts.onSubmit(val);
    });
    card.querySelector('.rf-cancel').addEventListener('click', function () {
      closeModal(overlay);
      if (opts.onCancel) opts.onCancel();
    });
    // Enter key submits
    card.querySelector('.rf-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var val = card.querySelector('.rf-input').value;
        closeModal(overlay);
        if (opts.onSubmit) opts.onSubmit(val);
      }
    });
  }

  /**
   * window.rfModal.review({ title, message, confirmText, cancelText, minChars, onSubmit, onCancel })
   */
  function showReview(opts) {
    opts = opts || {};
    var overlay = createOverlay();
    var card = document.createElement('div');
    card.className = 'rf-modal';
    card.innerHTML =
      '<div class="rf-modal-icon rf-prompt">' + icons.review + '</div>' +
      '<div class="rf-modal-title">' + (opts.title || 'Add your review') + '</div>' +
      '<div class="rf-modal-msg">' + (opts.message || 'Tell other travelers about your stay.') + '</div>' +
      '<div class="rf-modal-rating-row rf-stars"></div>' +
      '<p class="rf-modal-helper">Your rating and feedback help others choose better stays.</p>' +
      '<textarea class="rf-modal-textarea rf-review-input" placeholder="Write your review..."></textarea>' +
      '<div class="rf-modal-btns">' +
        '<button class="rf-modal-btn-secondary rf-cancel">' + (opts.cancelText || 'Cancel') + '</button>' +
        '<button class="rf-modal-btn-primary rf-submit">' + (opts.confirmText || 'Submit review') + '</button>' +
      '</div>';

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    var starsWrap = card.querySelector('.rf-stars');
    var currentRating = 5;
    for (var i = 1; i <= 5; i++) {
      var star = document.createElement('button');
      star.type = 'button';
      star.className = 'rf-modal-star-btn' + (i <= currentRating ? ' is-active' : '');
      star.setAttribute('data-value', String(i));
      star.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>';
      starsWrap.appendChild(star);
    }

    function paintStars(value) {
      var starBtns = starsWrap.querySelectorAll('.rf-modal-star-btn');
      starBtns.forEach(function (btn) {
        var v = parseInt(btn.getAttribute('data-value'), 10);
        btn.classList.toggle('is-active', v <= value);
      });
    }

    starsWrap.addEventListener('click', function (e) {
      var target = e.target.closest('.rf-modal-star-btn');
      if (!target) return;
      currentRating = parseInt(target.getAttribute('data-value'), 10) || 5;
      paintStars(currentRating);
    });

    requestAnimationFrame(function () {
      overlay.classList.add('rf-show');
      card.querySelector('.rf-review-input').focus();
    });

    card.querySelector('.rf-submit').addEventListener('click', function () {
      var reviewText = (card.querySelector('.rf-review-input').value || '').trim();
      var minChars = typeof opts.minChars === 'number' ? opts.minChars : 8;
      if (reviewText.length < minChars) {
        card.querySelector('.rf-review-input').focus();
        return;
      }
      closeModal(overlay);
      if (opts.onSubmit) {
        opts.onSubmit({
          rating: currentRating,
          description: reviewText
        });
      }
    });

    card.querySelector('.rf-cancel').addEventListener('click', function () {
      closeModal(overlay);
      if (opts.onCancel) opts.onCancel();
    });
  }

  // Expose globally
  window.rfModal = {
    success: showSuccess,
    error: showError,
    confirm: showConfirm,
    prompt: showPrompt,
    review: showReview
  };
})();
