(function () {
  function message(text, type) {
    window.setLoginMessage?.(text, type);
  }

  window.sendMagicLink = async function sendMagicLink(event) {
    event?.preventDefault();
    const email = document.getElementById('magicLinkEmail')?.value.trim().toLowerCase();
    const client = window.duitjomSupabaseClient;
    if (!email) return message('Sila masukkan alamat email yang sah.', 'error');
    if (!client) return message('Supabase belum dimuatkan. Sila muat semula halaman.', 'error');

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
