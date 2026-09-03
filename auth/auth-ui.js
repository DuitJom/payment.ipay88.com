(function () {
  // =====================================================
  // GLOBAL AUTH STATE & MESSAGE HANDLER
  // =====================================================
  window.currentAuthMethod = 'email'; // 'email', 'phone', 'totp'
  window.setLoginMessage = function setLoginMessage(text, type = 'info') {
    const messageElement = document.getElementById('loginMessage');
    if (!messageElement) return;
    messageElement.textContent = text || '';
    messageElement.className = 'login-message';
    messageElement.classList.add(
      type === 'error' ? 'text-red-600' : 
      type === 'success' ? 'text-emerald-600' : 
      'text-slate-500'
    );
  };

  // =====================================================
  // METHOD SWITCHER (EMAIL / PHONE / TOTP)
  // =====================================================
  window.switchAuthMethod = function switchAuthMethod(method) {
    window.currentAuthMethod = method;
    
    // Update tab styling
    document.querySelectorAll('.auth-method-tab').forEach(tab => {
      tab.classList.toggle('is-active', tab.dataset.method === method);
    });

    // Show/hide panels
    document.getElementById('emailPanel')?.classList.toggle('hidden', method !== 'email');
    document.getElementById('phonePanel')?.classList.toggle('hidden', method !== 'phone');
    document.getElementById('totpPanel')?.classList.toggle('hidden', method !== 'totp');

    window.setLoginMessage('');
  };

  // =====================================================
  // SUPABASE SESSION CHECK & UI UPDATE
  // =====================================================
  window.updateAuthUI = function updateAuthUI(session) {
    const isLoggedIn = Boolean(session?.user);
    const loginContainer = document.getElementById('loginContainer');
    const btnPay = document.getElementById('btnPembayaranPinjaman');
    const userInfo = document.getElementById('userInfo');
    const logoutBtn = document.getElementById('logoutButton');

    if (isLoggedIn) {
      // User telah login
      loginContainer?.classList.add('hidden');
      btnPay?.classList.remove('hidden');
      userInfo?.classList.remove('hidden');
      
      // Paparkan email pengguna jika tersedia
      if (userInfo && session.user?.email) {
        const userEmail = document.getElementById('userEmail');
        if (userEmail) userEmail.textContent = session.user.email;
      }
    } else {
      // User belum login
      loginContainer?.classList.remove('hidden');
      btnPay?.classList.add('hidden');
      userInfo?.classList.add('hidden');
      logoutBtn?.classList.add('hidden');
      window.setLoginMessage('');
    }
  };

  // =====================================================
  // LOGOUT FUNCTION
  // =====================================================
  window.logoutUser = async function logoutUser() {
    const client = window.duitjomSupabaseClient;
    if (!client) return window.setLoginMessage('Supabase belum dimuatkan.', 'error');

    const { error } = await client.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
      return window.setLoginMessage('Logout gagal: ' + error.message, 'error');
    }

    window.setLoginMessage('Anda telah log keluar.', 'success');
    window.updateAuthUI(null);
  };

  // =====================================================
  // INITIALIZE AUTH UI ON PAGE LOAD
  // =====================================================
  window.initAuthUI = async function initAuthUI() {
    const client = window.duitjomSupabaseClient;
    if (!client) {
      console.error('Supabase client not initialized');
      window.updateAuthUI(null);
      return;
    }

    // Dapatkan session semasa
    const { data, error } = await client.auth.getSession();
    if (error) console.error('Session error:', error);
    
    window.updateAuthUI(data?.session || null);

    // Dengarkan perubahan auth state
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);
      window.updateAuthUI(session);
    });

    // Cleanup subscription pada unload
    window.addEventListener('beforeunload', () => subscription?.unsubscribe());
  };

  // Jalankan init selepas Supabase dimulakan
  document.addEventListener('DOMContentLoaded', () => {
    // Tunggu 500ms untuk Supabase dimulakan
    setTimeout(window.initAuthUI, 500);
  });
}());
