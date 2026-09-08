(function () {
  const setMessage = (text, type) => window.setLoginMessage?.(text, type);

  // Menyimpan secret TOTP sementara menunggu pengesahan kod
  let totpSecretInstance = null;

  /**
   * Memulakan pendaftaran TOTP MFA pada Firebase.
   */
  window.enrolTotp = async function enrolTotp(event) {
    event?.preventDefault();
    const auth = window.duitjomFirebaseAuth;
    const user = auth?.currentUser;

    if (!auth || !user) return setMessage('Sila log masuk dahulu untuk mendaftar TOTP.', 'error');

    try {
      const multiFactorSession = await window.firebaseAuth.multiFactor(user).getSession();
      totpSecretInstance = await window.firebaseAuth.TotpMultiFactorGenerator.generateSecret(multiFactorSession);

      // Dapatkan URL/QR Code daripada Firebase TOTP secret
      const qrCodeUrl = totpSecretInstance.generateQrCodeUrl(user.email || 'User', 'DuitJom');
      
      // Jika anda menggunakan pustaka luaran untuk memapar QR Code dari URL:
      const qrImgElement = document.getElementById('totpQrCode');
      if (qrImgElement) {
        qrImgElement.src = `https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(qrCodeUrl)}`;
      }

      document.getElementById('totpSecret').textContent = totpSecretInstance.secretKey;
      document.getElementById('totpSetupDetails')?.classList.remove('hidden');
      setMessage('Imbas QR dengan aplikasi authenticator, kemudian masukkan kod 6 digit.', 'success');
    } catch (error) {
      console.error('TOTP Enrollment gagal:', error);
      setMessage(`TOTP tidak dapat dimulakan: ${error.message}`, 'error');
    }
  };

  /**
   * Mengesahkan kod TOTP dan melengkapkan pendaftaran MFA.
   */
  window.verifyTotp = async function verifyTotp(event) {
    event?.preventDefault();
    const auth = window.duitjomFirebaseAuth;
    const user = auth?.currentUser;
    const code = (document.getElementById('totpCode')?.value || '').replace(/\D/g, '');

    if (!totpSecretInstance || !/^\d{6}$/.test(code)) {
      return setMessage('Mulakan TOTP dahulu dan masukkan kod 6 digit.', 'error');
    }

    try {
      const multiFactorAssertion = window.firebaseAuth.TotpMultiFactorGenerator.assertionForEnrollment(
        totpSecretInstance,
        code
      );

      await window.firebaseAuth.multiFactor(user).enroll(multiFactorAssertion, 'DuitJom Authenticator');
      setMessage('TOTP berjaya diaktifkan.', 'success');
    } catch (error) {
      console.error('Pengesahan TOTP gagal:', error);
      setMessage(`Pengesahan TOTP gagal: ${error.message}`, 'error');
    }
  };
}());
