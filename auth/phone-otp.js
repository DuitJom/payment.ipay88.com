(function () {
  const phoneValue = () => `+60${(document.getElementById('phoneOtpNumber')?.value || '').replace(/\D/g, '').replace(/^0/, '')}`;
  const setMessage = (text, type) => window.setLoginMessage?.(text, type);

  // Menyimpan confirmationResult untuk pengesahan kod kelak
  let confirmationResult = null;

  function initRecaptcha(auth) {
    if (!window.recaptchaVerifier) {
      // Pastikan ada elemen bekas reCAPTCHA pada HTML atau gunakan invisible reCAPTCHA pada butang
      window.recaptchaVerifier = new window.firebaseAuth.RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible'
      });
    }
  }

  /**
   * Hantar kod OTP melalui SMS menggunakan Firebase Auth.
   */
  window.sendPhoneOtp = async function sendPhoneOtp(event) {
    event?.preventDefault();
    const phone = phoneValue();
    const auth = window.duitjomFirebaseAuth;

    if (!/^\+601\d{8,9}$/.test(phone)) return setMessage('Masukkan nombor Malaysia yang sah, contohnya 12 345 6789.', 'error');
    if (!auth) return window.showAuthConfigurationMessage?.();

    try {
      initRecaptcha(auth);
      const appVerifier = window.recaptchaVerifier;

      confirmationResult = await window.firebaseAuth.signInWithPhoneNumber(auth, phone, appVerifier);
      document.getElementById('phoneOtpVerify')?.classList.remove('hidden');
      setMessage('Kod OTP telah dihantar melalui SMS.', 'success');
    } catch (error) {
      console.error('Phone OTP gagal:', error);
      // Reset recaptcha jika gagal supaya pengguna boleh cuba semula
      window.recaptchaVerifier?.render().then(widgetId => grecaptcha.reset(widgetId));
      setMessage(`OTP tidak dapat dihantar: ${error.message}`, 'error');
    }
  };

  /**
   * Mengesahkan kod OTP SMS yang diterima.
   */
  window.verifyPhoneOtp = async function verifyPhoneOtp(event) {
    event?.preventDefault();
    const token = (document.getElementById('phoneOtpCode')?.value || '').replace(/\D/g, '');

    if (!/^\d{6}$/.test(token)) return setMessage('Masukkan kod OTP 6 digit.', 'error');
    if (!confirmationResult) return setMessage('Sila minta kod OTP terlebih dahulu.', 'error');

    try {
      const userCredential = await confirmationResult.confirm(token);
      window.updateAuthUI?.(userCredential.user);
      setMessage('Nombor telefon berjaya disahkan.', 'success');
    } catch (error) {
      console.error('Pengesahan SMS gagal:', error);
      setMessage(`Kod OTP tidak sah: ${error.message}`, 'error');
    }
  };
}());
