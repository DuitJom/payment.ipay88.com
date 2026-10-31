(() => {
  'use strict';
  const calculator = document.getElementById('loanCalculator');
  if (!calculator) return;
  const slider = calculator.querySelector('#loanAmountSlider');
  const display = calculator.querySelector('#loanAmountDisplay');
  const presets = calculator.querySelectorAll('[data-loan-amount]');
  const phoneInput = calculator.querySelector('#loanPhoneInput');
  const error = calculator.querySelector('#loanPhoneError');
  const min = Number(slider.min);
  const max = Number(slider.max);

  function updateAmount(value) {
    slider.value = Math.max(min, Math.min(max, Number(value)));
    const amount = Number(slider.value);
    const formatted = `RM ${amount.toLocaleString('en-MY')}`;
    display.textContent = formatted;
    slider.setAttribute('aria-valuetext', formatted);
    const percent = ((amount - min) / (max - min)) * 100;
    slider.style.background = `linear-gradient(to right, #1a3a5c 0%, #3b6e9a ${percent}%, #e2e8f0 ${percent}%, #e2e8f0 100%)`;
    presets.forEach(button => {
      const active = Number(button.dataset.loanAmount) === amount;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  slider.addEventListener('input', () => updateAmount(slider.value));
  presets.forEach(button => button.addEventListener('click', () => updateAmount(button.dataset.loanAmount)));
  phoneInput.addEventListener('input', () => {
    phoneInput.value = phoneInput.value.replace(/\D/g, '');
    phoneInput.removeAttribute('aria-invalid');
    error.hidden = true;
    error.textContent = '';
  });

  calculator.querySelector('#loanApplicationForm').addEventListener('submit', event => {
    event.preventDefault();
    // Accept a local mobile number with or without its leading zero.
    const phone = phoneInput.value.trim().replace(/^0/, '');
    let message = '';
    if (!phone) message = 'Sila masukkan nombor telefon anda untuk meneruskan.';
    else if (!/^1\d{8,9}$/.test(phone)) message = 'Sila masukkan nombor telefon yang sah, contohnya 123456789.';
    if (message) {
      error.textContent = message;
      error.hidden = false;
      phoneInput.setAttribute('aria-invalid', 'true');
      phoneInput.focus();
      return;
    }
    // Keep the supplied application destination; do not put phone data in the URL.
    window.location.assign('https://www.duitjom.my');
  });

  updateAmount(slider.value);
})();
