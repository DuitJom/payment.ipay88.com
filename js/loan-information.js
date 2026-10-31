(() => {
  'use strict';
  const section = document.getElementById('loanInformation');
  if (!section) return;
  const items = section.querySelectorAll('.info-faq-item');
  function setOpen(item, open) {
    item.classList.toggle('open', open);
    item.querySelector('.faq-question').setAttribute('aria-expanded', String(open));
    item.querySelector('.faq-answer').hidden = !open;
  }
  items.forEach(item => item.querySelector('.faq-question').addEventListener('click', () => {
    const open = !item.classList.contains('open');
    items.forEach(other => setOpen(other, other === item && open));
  }));

  const counters = section.querySelectorAll('.info-counter');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const format = (counter, value) => {
    const suffix = counter.dataset.suffix || '';
    return suffix === 'K+'
      ? `${Math.floor(value / 1000)}K+`
      : value.toFixed(Number(counter.dataset.decimals || 0)) + suffix;
  };
  const finish = () => counters.forEach(counter => {
    counter.textContent = format(counter, Number(counter.dataset.target));
  });
  // Keep readable final values when observers or animation are unavailable.
  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    finish();
    return;
  }
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    const start = performance.now();
    const step = now => {
      if (reducedMotion.matches) { finish(); return; }
      const progress = Math.min((now - start) / 2000, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      counters.forEach(counter => {
        counter.textContent = format(counter, Number(counter.dataset.target) * eased);
      });
      if (progress < 1) requestAnimationFrame(step);
      else finish();
    };
    requestAnimationFrame(step);
  }, { threshold: 0.2 });
  observer.observe(section.querySelector('.info-stats-grid'));
})();
