(() => {
  'use strict';
  const footer = document.getElementById('siteFooter');
  if (!footer) return;
  footer.querySelector('[data-footer-year]').textContent = new Date().getFullYear();
  const toast = footer.querySelector('.footer-toast');
  let toastTimer;
  const showToast = message => {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
  };
  footer.querySelectorAll('[data-footer-chat]').forEach(button => {
    button.addEventListener('click', () => {
      if (window.$crisp && typeof window.$crisp.push === 'function') {
        window.$crisp.push(['do', 'chat:open']);
      } else if (window.LiveChatWidget && typeof window.LiveChatWidget.call === 'function') {
        window.LiveChatWidget.call('maximize');
      } else {
        showToast('Sembang sedang dimuatkan. Sila cuba lagi atau e-mel support@duitjom.my.');
      }
    });
  });
  footer.querySelectorAll('a[href="#"]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      const label = link.getAttribute('aria-label') || link.textContent.replace('→', '').trim();
      showToast(`${label} — pautan belum tersedia. Hubungi support@duitjom.my untuk bantuan.`);
    });
  });
  const backToTop = footer.querySelector('.back-to-top');
  const updateScroll = () => backToTop.classList.toggle('visible', window.scrollY > 300);
  window.addEventListener('scroll', updateScroll, { passive: true });
  updateScroll();
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
})();
