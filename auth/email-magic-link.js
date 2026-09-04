(function () {
  function message(text, type) {
    window.setLoginMessage?.(text, type);
  }

  /**
   * Sends a magic link (OTP) to the specified email address for passwordless authentication.
   * @async
   * @param {Event} [event] - The form submit event to prevent default behavior
   * @returns {Promise<void>}
   */
  window.sendMagicLink = async function sendMagicLink(event) {
    event?.preventDefault();
    const email = document.getElementById('magicLinkEmail')?.value.trim().toLowerCase();
    const client = window.duitjomSupabaseClient;
    if (!email) return message('Sila masukkan alamat email yang sah.', 'error');
    if (!client) return window.showAuthConfigurationMessage?.();

    const button = document.getElementById('magicLinkButton');
    button?.setAttribute('disabled', 'disabled');
    if (button) button.textContent = 'Menghantar…';
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.DUITJOM_AUTH_REDIRECT_URL }
    });
    button?.removeAttribute('disabled');
    if (button) button.textContent = 'Hantar pautan log masuk';
    message(error ? `Pautan tidak dapat dihantar: ${error.message}` : 'Pautan log masuk telah dihantar. Sila semak email anda.', error ? 'error' : 'success');
  };
}());
