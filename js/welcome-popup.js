/* Launch carousel. Closing is a user action, unlocked after five elapsed seconds. */
(function () {
  'use strict';
  function init() {
    const overlay = document.getElementById('welcomePopup');
    if (!overlay || overlay.dataset.initialized) return;
    overlay.dataset.initialized = 'true';
    const storageKey = 'duitjom:welcome:launch-v1:hidden';
    try { if (window.localStorage.getItem(storageKey) === '1') return; } catch {}
    const popup = overlay.querySelector('.welcome-popup');
    const close = document.getElementById('welcomePopupCloseX');
    const checkbox = document.getElementById('welcomeDontShow');
    const countdown = document.getElementById('welcomeCountdown');
    const track = popup.querySelector('.welcome-track');
    const slides = Array.from(popup.querySelectorAll('[data-welcome-slide]'));
    const dots = Array.from(popup.querySelectorAll('[data-welcome-dot]'));
    const previousFocus = document.activeElement;
    let open = true, index = 0, startX = null, startY = null, autoSlide;
    const deadline = Date.now() + 5000;
    function show(next) {
      index = (next + slides.length) % slides.length;
      track.style.transform = `translateX(-${index * 100}%)`;
      overlay.dataset.slide = String(index);
      slides.forEach((slide, i) => slide.setAttribute('aria-hidden', String(i !== index)));
      dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === index)));
    }
    function restart() {
      window.clearInterval(autoSlide);
      if (open) autoSlide = window.setInterval(() => { if (!document.hidden) show(index + 1); }, 1500);
    }
    function manual(next) { show(next); restart(); }
    function tick() {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      close.disabled = remaining > 0;
      close.setAttribute('aria-label', remaining ? `Tutup popup selepas ${remaining} saat` : 'Tutup popup');
      countdown.textContent = remaining ? `${remaining} s` : '';
      countdown.hidden = remaining === 0;
    }
    function dismiss() {
      if (!open || Date.now() < deadline) return;
      open = false;
      window.clearInterval(autoSlide); window.clearInterval(timer);
      try { if (checkbox.checked) window.localStorage.setItem(storageKey, '1'); } catch {}
      overlay.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('welcome-popup-open');
      background.forEach(([el, inert]) => { el.inert = inert; });
      previousFocus?.focus?.({preventScroll:true});
    }
    const background = Array.from(document.body.children).filter(el => el !== overlay && !['SCRIPT','STYLE','LINK'].includes(el.tagName)).map(el => [el, el.inert]);
    background.forEach(([el]) => { el.inert = true; });
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('welcome-popup-open');
    tick(); const timer = window.setInterval(tick, 100);
    restart(); popup.focus({preventScroll:true});
    close.addEventListener('click', dismiss);
    // Backdrop taps deliberately never close the popup.
    dots.forEach((dot, i) => dot.addEventListener('click', () => manual(i)));
    popup.querySelector('.welcome-prev').addEventListener('click', () => manual(index - 1));
    popup.querySelector('.welcome-next').addEventListener('click', () => manual(index + 1));
    const carousel = popup.querySelector('.welcome-carousel');
    carousel.addEventListener('pointerdown', e => { startX = e.clientX; startY = e.clientY; window.clearInterval(autoSlide); });
    carousel.addEventListener('pointerup', e => {
      if (startX !== null) {
        const dx = e.clientX - startX, dy = e.clientY - startY;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) show(index + (dx < 0 ? 1 : -1));
      }
      startX = null; restart();
    });
    carousel.addEventListener('pointercancel', () => { startX = null; restart(); });
    carousel.addEventListener('pointerleave', () => { startX = null; restart(); });
    document.addEventListener('visibilitychange', () => { if (open) { tick(); restart(); } });
    document.addEventListener('keydown', e => {
      if (!open) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); dismiss(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); manual(index + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); manual(index - 1); }
      if (e.key === 'Tab') {
        const controls = Array.from(popup.querySelectorAll('button:not([disabled]), input'));
        const first = controls[0], last = controls.at(-1);
        if (e.shiftKey && (document.activeElement === first || document.activeElement === popup)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (document.activeElement === last || document.activeElement === popup)) { e.preventDefault(); first.focus(); }
      }
    }, true);
    slides.forEach(slide => {
      const img = slide.querySelector('img');
      const fallback = () => { img.hidden = true; slide.querySelector('.welcome-image-fallback').hidden = false; };
      img.addEventListener('error', fallback);
      if (img.complete && !img.naturalWidth) fallback();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
