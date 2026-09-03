(function () {
  const setMessage = (text, type) => window.setLoginMessage?.(text, type);

  /**
   * Enrolls the user in TOTP (Time-based One-Time Password) multi-factor authentication.
   * Generates a QR code and secret for use with authenticator apps.
   * @async
   * @param {Event} [event] - The form submit event to prevent default behavior
   * @returns {Promise<void>}
   */
  window.enrolTotp = async function enrolTotp(event) {
    event?.preventDefault();
    const client = window.duitjomSupabaseClient;
    if (!client) return setMessage('Supabase belum dimuatkan. Sila muat semula halaman.', 'error');
    const { data: factors } = await client.auth.mfa.listFactors();
    if (factors?.totp?.length) return setMessage('TOTP telah didaftarkan untuk akaun ini.', 'info');
    const { data, error } = await client.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'DuitJom Authenticator' });
    if (error) return setMessage(`TOTP tidak dapat dimulakan: ${error.message}`, 'error');
    document.getElementById('totpQrCode').src = data.totp.qr_code;
    document.getElementById('totpSecret').textContent = data.totp.secret;
    document.getElementById('totpFactorId').value = data.id;
    document.getElementById('totpSetupDetails')?.classList.remove('hidden');
    setMessage('Imbas QR dengan aplikasi authenticator, kemudian masukkan kod 6 digit.', 'success');
  };

  /**
   * Verifies the TOTP code from the user's authenticator app and completes the enrollment process.
   * @async
   * @param {Event} [event] - The form submit event to prevent default behavior
   * @returns {Promise<void>}
   */
  window.verifyTotp = async function verifyTotp(event) {
    event?.preventDefault();
    const client = window.duitjomSupabaseClient;
    const factorId = document.getElementById('totpFactorId')?.value;
    const code = (document.getElementById('totpCode')?.value || '').replace(/\D/g, '');
    if (!factorId || !/^\d{6}$/.test(code)) return setMessage('Mulakan TOTP dahulu dan masukkan kod 6 digit.', 'error');
    const { data: challenge, error: challengeError } = await client.auth.mfa.challenge({ factorId });
    if (challengeError) return setMessage(`Cabaran TOTP gagal: ${challengeError.message}`, 'error');
    const { error } = await client.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
    setMessage(error ? `Pengesahan TOTP gagal: ${error.message}` : 'TOTP berjaya diaktifkan.', error ? 'error' : 'success');
  };
}());
