(function () {
  function message(text, type) {
    window.setLoginMessage?.(text, type);
  }

  /**
   * Sends a magic link to the specified email address for passwordless authentication via Firebase Auth.
   * @async
   * @param {Event} [event] - The form submit event to prevent default behavior
   * @returns {Promise<void>}
   */
  window.sendMagicLink = async function sendMagicLink(event) {
    event?.preventDefault();
    const email = document.getElementById('magicLinkEmail')?.value.trim().toLowerCase();
    const auth = window.duitjomFirebaseAuth;

    if (!email) return message('Sila masukkan alamat email yang sah.', 'error');
    if (!auth) return window.showAuthConfigurationMessage?.();

    const button = document.getElementById('magicLinkButton');
    button?.setAttribute('disabled', 'disabled');
    if (button) button.textContent = 'Menghantar…';

    const actionCodeSettings = {
      url: window.DUITJOM_AUTH_REDIRECT_URL || window.location.href,
      handleCodeInApp: true,
    };

    try {
      await window.firebaseAuth.sendSignInLinkToEmail(auth, email, actionCodeSettings);
      
      // Simpan email dalam localStorage untuk digunakan semasa melengkapkan log masuk apabila pautan ditekan
      window.localStorage.setItem('emailForSignIn', email);

      message('Pautan log masuk telah dihantar. Sila semak email anda.', 'success');
    } catch (error) {
      console.error('Email Link gagal:', error);
      message(`Pautan tidak dapat dihantar: ${error.message}`, 'error');
    } finally {
      button?.removeAttribute('disabled');
      if (button) button.textContent = 'Hantar pautan log masuk';
    }
  };
}());
