(function () {
  const phoneValue = () => `+60${(document.getElementById('phoneOtpNumber')?.value || '').replace(/\D/g, '').replace(/^0/, '')}`;
  const setMessage = (text, type) => window.setLoginMessage?.(text, type);

  /**
   * Sends a one-time password (OTP) via SMS to the specified Malaysian phone number.
   * @async
   * @param {Event} [event] - The form submit event to prevent default behavior
   * @returns {Promise<void>}
   */
  window.sendPhoneOtp = async function sendPhoneOtp(event) {
    event?.preventDefault();
    const phone = phoneValue();
    const client = window.duitjomSupabaseClient;
    if (!/^\+601\d{8,9}$/.test(phone)) return setMessage('Masukkan nombor Malaysia yang sah, contohnya 12 345 6789.', 'error');
    if (!client) return window.showAuthConfigurationMessage?.();
    const { error } = await client.auth.signInWithOtp({ phone });
    if (error) return setMessage(`OTP tidak dapat dihantar: ${error.message}`, 'error');
    document.getElementById('phoneOtpVerify')?.classList.remove('hidden');
    setMessage('Kod OTP telah dihantar melalui SMS.', 'success');
  };

  /**
   * Verifies the OTP code received via SMS for phone number authentication.
   * @async
   * @param {Event} [event] - The form submit event to prevent default behavior
   * @returns {Promise<void>}
   */
  window.verifyPhoneOtp = async function verifyPhoneOtp(event) {
    event?.preventDefault();
    const token = (document.getElementById('phoneOtpCode')?.value || '').replace(/\D/g, '');
    const client = window.duitjomSupabaseClient;
    if (!/^\d{6}$/.test(token)) return setMessage('Masukkan kod OTP 6 digit.', 'error');
    if (!client) return window.showAuthConfigurationMessage?.();
    const { error } = await client.auth.verifyOtp({ phone: phoneValue(), token, type: 'sms' });
    setMessage(error ? `Kod OTP tidak sah: ${error.message}` : 'Nombor telefon berjaya disahkan.', error ? 'error' : 'success');
  };
}());
