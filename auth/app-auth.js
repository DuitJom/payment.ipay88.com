// auth/app-auth.js

// ===== 1. IMPORT (paling atas) =====
import {
  auth,
  authPersistenceReady,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "../firebase-config.js";

// ===== 2. RUJUKAN ELEMEN HTML =====
const googleLoginButton   = document.getElementById("googleLoginButton");
const emailToggleButton   = document.getElementById("emailToggleButton");
const emailLoginForm      = document.getElementById("emailLoginForm");
const emailInput          = document.getElementById("emailInput");
const logoutButton        = document.getElementById("logoutButton");
const loginPanel          = document.getElementById("authLoginPanel");
const userPanel           = document.getElementById("authUserPanel");
const userInfo            = document.getElementById("userDisplay");
const messageBox          = document.getElementById("authMessage");
const paymentActionPanel  = document.getElementById("btnPembayaranPinjaman");
const authUserLabel       = document.getElementById("authUserLabel");

// ===== 3. FUNGSI PEMBANTU =====
function showMessage(text, type = "info") {
  if (!messageBox) return;
  messageBox.textContent = text;
  messageBox.className = `login-message auth-message ${type}`;
  messageBox.hidden = false;
}

function clearMessage() {
  if (!messageBox) return;
  messageBox.textContent = "";
  messageBox.hidden = true;
}

function setBusy(element, busy) {
  if (!element) return;
  element.disabled = busy;
  element.classList.toggle("is-busy", busy);
}

function friendlyError(error) {
  const map = {
    "auth/popup-closed-by-user": "Tetingkap log masuk ditutup sebelum selesai.",
    "auth/unauthorized-domain": "Domain ini belum dibenarkan dalam Firebase Console.",
    "auth/too-many-requests": "Terlalu banyak percubaan. Cuba lagi sebentar nanti."
  };
  return map[error?.code] || `Ralat: ${error?.message || error}`;
}

function setPanelVisible(panel, visible) {
  if (!panel) return;
  panel.hidden = !visible;
  panel.classList.toggle("hidden", !visible);
}

// ===== 4. SESSION HELPER =====
function setSession(email) {
  localStorage.setItem("duitjom_session", JSON.stringify({
    email: email,
    provider: "otp",
    loginAt: Date.now()
  }));
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem("duitjom_session"));
  } catch { return null; }
}

function clearSession() {
  localStorage.removeItem("duitjom_session");
}

// ===== 5. GOOGLE SIGN-IN (kekal Firebase) =====
googleLoginButton?.addEventListener("click", async () => {
  clearMessage();
  setBusy(googleLoginButton, true);
  try {
    await authPersistenceReady;
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    showMessage(friendlyError(error), "error");
  } finally {
    setBusy(googleLoginButton, false);
  }
});

// ===== 6. EMAIL OTP LOGIN (ganti password) =====
emailLoginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage();

  const email = emailInput.value.trim();
  if (!email) {
    showMessage("Sila masukkan alamat e-mel.", "error");
    return;
  }

  if (!loginTurnstileToken) {
    showMessage("Sila lengkapkan pengesahan keselamatan.", "error");
    return;
  }

  const submitBtn = emailLoginForm.querySelector("button[type=submit]");
  setBusy(submitBtn, true);

  try {
    // Hantar OTP via Worker
    const data = await sendOTP(email, loginTurnstileToken);

    if (data.success) {
      // Papar overlay OTP
      showOTPOverlay(email);

      // Callback selepas OTP disahkan
      window.onOTPVerified = function() {
        setSession(email);
        window.location.href = "/dashboard.html"; // ⚠️ TUKAR ke halaman anda
      };
    } else {
      showMessage(data.message || "Gagal menghantar OTP.", "error");
    }
  } catch (err) {
    showMessage("Ralat sambungan. Sila cuba lagi.", "error");
  } finally {
    setBusy(submitBtn, false);
  }
});

// ===== 7. LOG KELUAR =====
logoutButton?.addEventListener("click", async () => {
  clearSession();
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout error:", error);
  }
});

window.logoutUser = async function () {
  clearSession();
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout failed:", error);
  }
};

// ===== 8. PANTAU STATUS LOGIN =====
onAuthStateChanged(auth, (user) => {
  // Semak Firebase (Google) atau OTP session
  const otpSession = getSession();

  if (user || otpSession) {
    // User logged in
    setPanelVisible(loginPanel, false);
    setPanelVisible(userPanel, true);

    const displayName = user
      ? (user.displayName || user.email)
      : (otpSession?.email || "Pengguna");

    if (userInfo) userInfo.textContent = displayName;
    if (paymentActionPanel) paymentActionPanel.classList.remove("hidden");
    if (authUserLabel) authUserLabel.textContent = displayName;

  } else {
    // User logged out
    setPanelVisible(userPanel, false);
    setPanelVisible(loginPanel, true);
    if (paymentActionPanel) paymentActionPanel.classList.add("hidden");
    if (authUserLabel) authUserLabel.textContent = "";
  }
});
