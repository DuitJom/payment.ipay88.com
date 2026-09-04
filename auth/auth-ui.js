(function () {
  let authUIInitialized = false;
  let currentSession = null;
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

  function requireClient() {
    const client = window.duitjomSupabaseClient;
    if (!client) window.showAuthConfigurationMessage?.();
    return client;
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

  window.signInWithGoogle = async function signInWithGoogle(event) {
    event?.preventDefault();
    const client = requireClient();
    if (!client) return;

    setGoogleButtonsDisabled(true);
    try {
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.DUITJOM_AUTH_REDIRECT_URL }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Google Sign-In gagal:', error);
      window.setLoginMessage('Google Sign-In gagal: ' + error.message, 'error');
      setGoogleButtonsDisabled(false);
    }
  };

  window.sendEmailOTP = async function sendEmailOTP() {
    const emailInput = document.getElementById('otpEmail');
    const email = emailInput?.value.trim().toLowerCase();
    if (!email || !emailInput.checkValidity()) {
      emailInput?.focus();
      return window.setLoginMessage('Sila masukkan alamat email yang sah.', 'error');
    }
    const client = requireClient();
    if (!client) return;

    const { error } = await client.auth.signInWithOtp({ email });
    if (error) {
      console.error('Email OTP gagal:', error);
      return window.setLoginMessage('OTP tidak dapat dihantar: ' + error.message, 'error');
    }

    document.getElementById('otpVerificationSection')?.classList.remove('hidden');
    window.setLoginMessage('Kod OTP telah dihantar ke email anda.', 'success');
  };

  window.verifyEmailOTP = async function verifyEmailOTP() {
    const email = document.getElementById('otpEmail')?.value.trim().toLowerCase();
    const token = (document.getElementById('otpCode')?.value || '').replace(/\D/g, '');
    if (!email || !/^\d{6}$/.test(token)) {
      return window.setLoginMessage('Masukkan email dan kod OTP 6 digit.', 'error');
    }
    const client = requireClient();
    if (!client) return;

    const { data, error } = await client.auth.verifyOtp({ email, token, type: 'email' });
    if (error) {
      console.error('Pengesahan OTP gagal:', error);
      return window.setLoginMessage('Kod OTP tidak sah atau telah tamat tempoh.', 'error');
    }

    window.updateAuthUI(data.session);
    window.closeSidebar?.();
  };

  window.updateAuthUI = function updateAuthUI(session) {
    currentSession = session || null;
    const isLoggedIn = Boolean(currentSession?.user);
    const user = currentSession?.user;
    const metadata = user?.user_metadata || {};
    const displayName = metadata.full_name || metadata.name || user?.email || user?.phone || '';

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
    if (userEmail) userEmail.textContent = user?.email || user?.phone || displayName;

    if (!isLoggedIn) window.setLoginMessage('');
  };

  window.logoutUser = async function logoutUser() {
    const client = requireClient();
    if (!client) return;

    const { error } = await client.auth.signOut();
    if (error) {
      console.error('Logout gagal:', error);
      return window.setLoginMessage('Log keluar gagal: ' + error.message, 'error');
    }

    window.updateAuthUI(null);
    window.closeSidebar?.();
    document.getElementById('paymentPage')?.classList.add('hidden');
    document.getElementById('qrPage')?.classList.add('hidden');
    document.getElementById('thanksPage')?.classList.add('hidden');
    document.getElementById('mainPage')?.classList.remove('hidden');
    document.getElementById('auth-login-container')?.classList.remove('hidden');
    document.getElementById('siteFooter')?.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  function renderTurnstileIfConfigured() {
    const container = document.querySelector('[data-sitekey]');
    const siteKey = container?.dataset.sitekey?.trim();
    if (!container || !siteKey || !window.turnstile || container.dataset.rendered) return;

    container.classList.add('cf-turnstile');
    window.turnstile.render(container, { sitekey: siteKey });
    container.dataset.rendered = 'true';
  }

  window.initAuthUI = async function initAuthUI() {
    if (authUIInitialized) return;
    authUIInitialized = true;

    const client = window.duitjomSupabaseClient;
    if (!client) {
      window.updateAuthUI(null);
      window.setLoginMessage('Log masuk tersedia selepas konfigurasi Supabase dilengkapkan.', 'info');
      return;
    }

    const { data, error } = await client.auth.getSession();
    if (error) console.error('Sesi Supabase gagal dimuatkan:', error);
    window.updateAuthUI(data?.session || null);

    client.auth.onAuthStateChange((_event, session) => {
      window.updateAuthUI(session);
    });
  };

  document.addEventListener('duitjom:component-loaded', (event) => {
    if (event.detail?.containerId === 'auth-login-container') {
      window.initAuthUI();
      renderTurnstileIfConfigured();
    }

    if (event.detail?.containerId === 'sidebar-container') {
      window.updateAuthUI(currentSession);
    }
  });
}());
