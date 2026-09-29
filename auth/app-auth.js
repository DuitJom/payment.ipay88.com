// auth/app-auth.js

// ===== 1. IMPORT =====
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
const magicLinkButton     = document.getElementById("magicLinkButton");
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
function setSession(email, provider = "otp") {
  const isFirstLogin = !localStorage.getItem("duitjom_session");
  localStorage.setItem("duitjom_session", JSON.stringify({
    email: email,
    provider: provider,
    loginAt: Date.now()
  }));
  return isFirstLogin;
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem("duitjom_session"));
  } catch { return null; }
}

function clearSession() {
  localStorage.removeItem("duitjom_session");
}

// ===== 5. WORKER API =====
const WORKER_URL = "https://e-kyc.duitjom.my";

async function callWorker(endpoint, body) {
  const res = await fetch(WORKER_URL + endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return await res.json();
}

// ===== 6. HANTAR WELCOME EMAIL =====
async function sendWelcomeEmail(email, name) {
  try {
    await callWorker("/api/welcome", { email: email, name: name });
  } catch (err) {
    console.error("Welcome email failed:", err);
  }
}

// ===== 7. GOOGLE SIGN-IN =====
googleLoginButton?.addEventListener("click", async () => {
  clearMessage();
  setBusy(googleLoginButton, true);
  try {
    await authPersistenceReady;
    const result = await signInWithPopup(auth, googleProvider);
    const email = result.user.email;
    const name = result.user.displayName || email.split("@")[0];
    const isFirst = setSession(email, "google");
    if (isFirst) await sendWelcomeEmail(email, name);
  } catch (error) {
    showMessage(friendlyError(error), "error");
  } finally {
    setBusy(googleLoginButton, false);
  }
});

// ===== 8. EMAIL OTP LOGIN =====
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
    const data = await callWorker("/api/send-otp", {
      email: email,
      turnstileToken: loginTurnstileToken
    });

    if (data.success) {
      showMessage("Kod OTP telah dihantar ke e-mel anda.", "success");
      showOTPOverlay(email);

      window.onOTPVerified = async function() {
        const isFirst = setSession(email, "otp");
        if (isFirst) await sendWelcomeEmail(email, email.split("@")[0]);
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

// ===== 9. MAGIC LINK LOGIN =====
magicLinkButton?.addEventListener("click", async () => {
  clearMessage();

  const email = emailInput.value.trim();
  if (!email) {
    showMessage("Sila masukkan alamat e-mel dahulu.", "error");
    return;
  }
  if (!loginTurnstileToken) {
    showMessage("Sila lengkapkan pengesahan keselamatan.", "error");
    return;
  }

  setBusy(magicLinkButton, true);

  try {
    const data = await callWorker("/api/magic-link", {
      email: email,
      turnstileToken: loginTurnstileToken
    });

    if (data.success) {
      showMessage("Pautan log masuk telah dihantar ke e-mel anda. Semak peti masuk anda.", "success");
    } else {
      showMessage(data.message || "Gagal menghantar pautan.", "error");
    }
  } catch (err) {
    showMessage("Ralat sambungan. Sila cuba lagi.", "error");
  } finally {
    setBusy(magicLinkButton, false);
  }
});

// ===== 10. LOG KELUAR =====
logoutButton?.addEventListener("click", async () => {
  clearSession();
  try { await signOut(auth); } catch (e) { console.error(e); }
});

window.logoutUser = async function () {
  clearSession();
  try { await signOut(auth); } catch (e) { console.error(e); }
};

// ===== 11. PANTAU STATUS LOGIN =====
onAuthStateChanged(auth, (user) => {
  const otpSession = getSession();

  if (user || otpSession) {
    setPanelVisible(loginPanel, false);
    setPanelVisible(userPanel, true);

    const displayName = user
      ? (user.displayName || user.email)
      : (otpSession?.email || "Pengguna");

    if (userInfo) userInfo.textContent = displayName;
    if (paymentActionPanel) paymentActionPanel.classList.remove("hidden");
    if (authUserLabel) authUserLabel.textContent = displayName;
  } else {
    setPanelVisible(userPanel, false);
    setPanelVisible(loginPanel, true);
    if (paymentActionPanel) paymentActionPanel.classList.add("hidden");
    if (authUserLabel) authUserLabel.textContent = "";
  }
});
