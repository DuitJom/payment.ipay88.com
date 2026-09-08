(function () {
  let authUIInitialized = false;
  let currentUser = null;
  window.currentAuthMethod = 'email';

  window.setLoginMessage = function setLoginMessage(text, type = 'info') {
    document.querySelectorAll('[data-auth-message]').forEach((messageElement) => {
      messageElement.textContent = text || '';
      messageElement.className = 'login-message';
      messageElement.dataset.authMessage = '';
      messageElement.classList.add(
        type === 'error'
          ? 'text-red-600'
          : type === 'success'
            ? 'text-emerald-600'
            : 'text-slate-500'
      );
    });
  };

  // 1. Dapatkan Firebase Auth instance daripada window
  function requireAuth() {
    const auth = window.duitjomFirebaseAuth;
    if (!auth) window.showAuthConfigurationMessage?.();
    return auth;
  }

  function setGoogleButtonsDisabled(disabled) {
    document.querySelectorAll('[data-google-sign-in]').forEach((button) => {
      button.disabled = disabled;
      button.classList.toggle('opacity-60', disabled);
      button.classList.toggle('cursor-wait', disabled);
    });
  }

  window.switchAuthMethod = function switchAuthMethod(method) {
    window.currentAuthMethod = method;

    document.querySelectorAll('.login-method').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.method === method);
    });

    document.getElementById('emailPanel')?.classList.toggle('hidden', method !== 'email');
    document.getElementById('phonePanel')?.classList.toggle('hidden', method !== 'phone');
    document.getElementById('totpPanel')?.classList.toggle('hidden', method !== 'totp');
    window.setLoginMessage('');
  };

  // 2. Google Sign-In menggunakan Firebase
  window.signInWithGoogle = async function signInWithGoogle(event) {
    event?.preventDefault();
    const auth = requireAuth();
    if (!auth) return;

    setGoogleButtonsDisabled(true);
    try {
      const provider = new window.firebaseAuth.GoogleAuthProvider();
      await window.firebaseAuth.signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Google Sign-In gagal:', error);
      window.setLoginMessage('Google Sign-In gagal: ' + error.message, 'error');
      setGoogleButtonsDisabled(false);
    }
  };

  // 3. Email Magic Link (Gantian untuk OTP Email)
  window.sendEmailOTP = async function sendEmailOTP() {
    const emailInput = document.getElementById('otpEmail');
    const email = emailInput?.value.trim().toLowerCase();
    if (!email || !emailInput.checkValidity()) {
      emailInput?.focus();
      return window.setLoginMessage('Sila masukkan alamat email yang sah.', 'error');
    }
    const auth = requireAuth();
    if (!auth) return;

    const actionCodeSettings = {
      url: window.DUITJOM_AUTH_REDIRECT_URL || window.location.href,
      handleCodeInApp: true,
    };

    try {
      await window.firebaseAuth.sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      document.getElementById('otpVerificationSection')?.classList.remove('hidden');
      window.setLoginMessage('Pautan log masuk telah dihantar ke email anda.', 'success');
    } catch (error) {
      console.error('Email Link gagal:', error);
      window.setLoginMessage('Pautan log masuk tidak dapat dihantar: ' + error.message, 'error');
    }
  };

  // Pengesahan Pautan Email (Jika pengguna menekan pautan email)
  window.verifyEmailOTP = async function verifyEmailOTP() {
    const auth = requireAuth();
    if (!auth) return;

    if (window.firebaseAuth.isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        email = window.prompt('Sila masukkan email anda untuk pengesahan:');
      }
      try {
        const result = await window.firebaseAuth.signInWithEmailLink(auth, email, window.location.href);
        window.localStorage.removeItem('emailForSignIn');
        window.updateAuthUI(result.user);
        window.closeSidebar?.();
      } catch (error) {
        console.error('Pengesahan pautan email gagal:', error);
        window.setLoginMessage('Pautan log masuk tidak sah atau telah tamat tempoh.', 'error');
      }
    }
  };

  // 4. Update UI berdasarkan Firebase User Object
  window.updateAuthUI = function updateAuthUI(user) {
    currentUser = user || null;
    const isLoggedIn = Boolean(currentUser);
    const displayName = currentUser?.displayName || currentUser?.email || currentUser?.phoneNumber || '';

    document.querySelectorAll('[data-auth-sign-in]').forEach((section) => {
      section.classList.toggle('hidden', isLoggedIn);
    });

    document.querySelectorAll('[data-auth-account]').forEach((section) => {
      section.classList.toggle('hidden', !isLoggedIn);
    });

    document.getElementById('btnPembayaranPinjaman')?.classList.toggle('hidden', !isLoggedIn);
    document.querySelectorAll('[data-auth-user-name]').forEach((element) => {
      element.textContent = displayName;
    });

    const authUserLabel = document.getElementById('authUserLabel');
    const userEmail = document.getElementById('userEmail');
    if (authUserLabel) authUserLabel.textContent = displayName;
    if (userEmail) userEmail.textContent = currentUser?.email || currentUser?.phoneNumber || displayName;

    if (!isLoggedIn) window.setLoginMessage('');
  };

  // 5. Log keluar pengguna
  window.logoutUser = async function logoutUser() {
    const auth = requireAuth();
    if (!auth) return;

    try {
      await window.firebaseAuth.signOut(auth);
      window.updateAuthUI(null);
      window.closeSidebar?.();
      document.getElementById('paymentPage')?.classList.add('hidden');
      document.getElementById('qrPage')?.classList.add('hidden');
      document.getElementById('thanksPage')?.classList.add('hidden');
      document.getElementById('mainPage')?.classList.remove('hidden');
      document.getElementById('auth-login-container')?.classList.remove('hidden');
      document.getElementById('siteFooter')?.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Logout gagal:', error);
      window.setLoginMessage('Log keluar gagal: ' + error.message, 'error');
    }
  };

  function renderTurnstileIfConfigured() {
    const container = document.querySelector('[data-sitekey]');
    const siteKey = container?.dataset.sitekey?.trim();
    if (!container || !siteKey || !window.turnstile || container.dataset.rendered) return;

    container.classList.add('cf-turnstile');
    window.turnstile.render(container, { sitekey: siteKey });
    container.dataset.rendered = 'true';
  }

  // 6. Listener Status Pengesahan Firebase
  window.initAuthUI = async function initAuthUI() {
    if (authUIInitialized) return;
    authUIInitialized = true;

    const auth = window.duitjomFirebaseAuth;
    if (!auth) {
      window.updateAuthUI(null);
      window.setLoginMessage('Log masuk tersedia selepas konfigurasi Firebase dilengkapkan.', 'info');
      return;
    }

    // Listener automatik Firebase apabila status log masuk berubah
    window.firebaseAuth.onAuthStateChanged(auth, (user) => {
      window.updateAuthUI(user);
    });

    // Semak jika pengguna sampai melalui Email Link
    window.verifyEmailOTP();
  };

  document.addEventListener('duitjom:component-loaded', (event) => {
    if (event.detail?.containerId === 'auth-login-container') {
      window.initAuthUI();
      renderTurnstileIfConfigured();
    }

    if (event.detail?.containerId === 'sidebar-container') {
      window.updateAuthUI(currentUser);
    }
  });
}());
