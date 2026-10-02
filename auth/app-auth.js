// Load Firebase independently so email/OTP controls remain usable if its CDN fails.
let auth = null;
let firebase = null;
let firebaseLoadError = null;

const googleLoginButton = document.getElementById("googleLoginButton");
const emailToggleButton = document.getElementById("emailToggleButton");
const emailLoginForm = document.getElementById("emailLoginForm");
const emailInput = document.getElementById("emailInput");
const otpInputs = Array.from(document.querySelectorAll("[data-login-otp]"));
const verifyOtpButton = document.getElementById("verifyOtpButton");
const resendOtpButton = document.getElementById("resendOtpButton");
const requestOtpButton = document.getElementById("emailLoginButton");
let pendingEmail = null;
let otpBusy = false;
let resendUntil = 0;
let resendTimer = null;

const magicLinkButton = document.getElementById("magicLinkButton");
const logoutButton = document.getElementById("logoutButton");
const loginPanel = document.getElementById("authLoginPanel");
const userPanel = document.getElementById("authUserPanel");
const userInfo = document.getElementById("userDisplay");
const messageBox = document.getElementById("authMessage");
const paymentActionPanel = document.getElementById("btnPembayaranPinjaman");
const authUserLabel = document.getElementById("authUserLabel");

const WORKER_URL = "https://e-kyc.duitjom.my";
const WORKER_TIMEOUT_MS = 10_000;

const SESSION_KEY = "duitjom_session";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const WELCOMED_PREFIX = "duitjom_welcomed_";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;


/* =========================================
   MESSAGE
========================================= */

function showMessage(text, type = "info") {
  if (!messageBox) return;

  messageBox.textContent = text;
  messageBox.classList.remove("info", "success", "error", "warning");
  messageBox.classList.add(type);
  messageBox.hidden = false;
}

function clearMessage() {
  if (!messageBox) return;

  messageBox.textContent = "";
  messageBox.hidden = true;
}


/* =========================================
   BUTTON / BUSY STATE
========================================= */

function setBusy(element, busy) {
  if (!element) return;

  element.disabled = busy;
  element.classList.toggle("is-busy", busy);
}


/* =========================================
   EMAIL VALIDATION
========================================= */

function isValidEmail(value) {
  return (
    typeof value === "string" &&
    EMAIL_PATTERN.test(value.trim())
  );
}


/* =========================================
   FRIENDLY ERROR MESSAGE
========================================= */

function friendlyError(error) {
  const map = {
    "auth/popup-closed-by-user":
      "Tetingkap log masuk ditutup sebelum selesai.",

    "auth/unauthorized-domain":
      "Domain ini belum dibenarkan dalam Firebase Console.",

    "auth/too-many-requests":
      "Terlalu banyak percubaan. Cuba lagi sebentar nanti.",

    "auth/network-request-failed":
      "Ralat rangkaian. Sila semak sambungan internet anda dan cuba lagi.",

    "auth/popup-blocked":
      "Tetingkap log masuk disekat oleh pelayar. Sila benarkan popup atau cuba lagi.",

    "auth/cancelled-popup-request":
      "Permintaan log masuk dibatalkan kerana satu tetingkap lain sedang dibuka.",

    "auth/operation-not-supported-in-this-environment":
      "Log masuk popup tidak disokong pada pelayar ini. Sila guna kaedah lain."
  };

  if (error?.message === "TIMEOUT") {
    return "Sambungan mengambil masa terlalu lama. Sila cuba lagi.";
  }

  return map[error?.code] || `Ralat: ${error?.message || String(error)}`;
}


/* =========================================
   PANEL VISIBILITY
========================================= */

function setPanelVisible(panel, visible) {
  if (!panel) return;

  panel.hidden = !visible;
  panel.classList.toggle("hidden", !visible);
}


/* =========================================
   SESSION
========================================= */

function setSession(email, provider = "otp", extra = {}) {
  try {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        email,
        provider,
        loginAt: Date.now(),
        verified: extra.verified === true
      })
    );
  } catch (error) {
    console.warn("Sesi tidak dapat disimpan:", error);
  }
}

function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);

    if (!raw) return null;

    const session = JSON.parse(raw);

    if (
      !session ||
      typeof session !== "object" ||
      session.verified !== true ||
      typeof session.email !== "string" ||
      !session.email.trim()
    ) {
      clearSession();
      return null;
    }

    const loginAt = Number(session.loginAt);
    const age = Date.now() - loginAt;

    // Reject invalid, expired, and future-dated sessions.
    if (
      !Number.isFinite(loginAt) ||
      age < 0 ||
      age > SESSION_MAX_AGE_MS
    ) {
      clearSession();
      return null;
    }

    return session;
  } catch (error) {
    clearSession();
    return null;
  }
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.warn("Sesi tidak dapat dipadam:", error);
  }
}

function hasVerifiedIdentity() {
  const user = auth?.currentUser;

  if (user?.emailVerified === true) {
    return true;
  }

  return getSession()?.verified === true;
}


/* =========================================
   CLOUDFLARE WORKER API
========================================= */

async function callWorker(endpoint, body) {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    WORKER_TIMEOUT_MS
  );

  try {
    const response = await fetch(`${WORKER_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error(
        "Perkhidmatan pengesahan tidak memberi respons yang sah. Sila cuba lagi atau hubungi sokongan."
      );
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
        `HTTP ${response.status} ${response.statusText || ""}`.trim()
      );
    }

    return data;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("TIMEOUT");
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}


/* =========================================
   WELCOME EMAIL
========================================= */

async function sendWelcomeEmailOnce(email, name) {
  if (!email) return false;

  const key = WELCOMED_PREFIX + String(email).toLowerCase();

  try {
    if (localStorage.getItem(key)) {
      return false;
    }
  } catch {
    // Continue if localStorage cannot be read.
  }

  try {
    const data = await callWorker("/api/welcome", { email, name });
    if (data?.success !== true) return false;
  } catch (error) {
    // Do not mark as sent: a later login can retry.
    console.error("Welcome email failed:", error);
    return false;
  }

  try {
    localStorage.setItem(key, String(Date.now()));
  } catch (error) {
    console.warn("Tanda welcome email tidak dapat disimpan:", error);
  }

  return true;
}


/* =========================================
   TURNSTILE
========================================= */

function resetLoginTurnstile() {
  window.loginTurnstileToken = null;

  // For implicitly rendered widgets, reset() without a DOM element.
  if (window.turnstile) {
    try {
      window.turnstile.reset("#loginTurnstileWidget");
    } catch (error) {
      console.warn("Turnstile tidak dapat direset:", error);
    }
  }

  const button = document.getElementById("emailLoginButton");
  if (button) {
    updateOtpControls();
  }
}


/* =========================================
   LOGIN / LOGOUT PANEL
========================================= */

function renderLoggedIn(displayName) {
  setPanelVisible(loginPanel, false);
  setPanelVisible(userPanel, true);

  if (userInfo) userInfo.textContent = displayName;
  if (authUserLabel) authUserLabel.textContent = displayName;

  if (paymentActionPanel) {
    paymentActionPanel.classList.toggle(
      "hidden",
      !hasVerifiedIdentity()
    );
  }
}

function renderLoggedOut() {
  setPanelVisible(userPanel, false);
  setPanelVisible(loginPanel, true);

  paymentActionPanel?.classList.add("hidden");

  if (authUserLabel) authUserLabel.textContent = "";
  if (userInfo) userInfo.textContent = "";
}


/* =========================================
   EMAIL FORM TOGGLE
========================================= */

emailToggleButton?.addEventListener("click", () => {
  if (!emailLoginForm) return;

  const shouldShow = emailLoginForm.hidden;
  setPanelVisible(emailLoginForm, shouldShow);
  emailToggleButton.setAttribute("aria-expanded", String(shouldShow));
  if (shouldShow) emailInput?.focus();
});


/* =========================================
   GOOGLE LOGIN
========================================= */
googleLoginButton?.addEventListener("click", async () => {
  clearMessage();
  setBusy(googleLoginButton, true);
  try {
    await firebaseReady;
    if (!firebase) throw firebaseLoadError || new Error("Google log masuk belum tersedia. Sila muat semula halaman.");
    const result = await firebase.signInWithPopup(auth, firebase.googleProvider);
    const email = result.user.email;
    const name = result.user.displayName || email?.split("@")[0] || "Pengguna";
    setSession(email, "google", { verified: result.user.emailVerified === true });
    renderLoggedIn(name);
    void sendWelcomeEmailOnce(email, name);
  } catch (error) {
    showMessage(friendlyError(error), "error");
  } finally {
    setBusy(googleLoginButton, false);
  }
});

/* =========================================
   INLINE EMAIL OTP
========================================= */
function updateOtpControls() {
  const coolingDown = Date.now() < resendUntil;
  if (requestOtpButton) requestOtpButton.disabled = otpBusy || coolingDown || !window.loginTurnstileToken;
  if (verifyOtpButton) verifyOtpButton.disabled = otpBusy || !pendingEmail;
  if (resendOtpButton) resendOtpButton.disabled = otpBusy || coolingDown;
  if (emailInput) emailInput.readOnly = otpBusy;
  if (magicLinkButton) magicLinkButton.disabled = otpBusy;
}
window.updateLoginOtpControls = updateOtpControls;

function tickResendCountdown() {
  const seconds = Math.max(0, Math.ceil((resendUntil - Date.now()) / 1000));
  if (resendOtpButton) {
    resendOtpButton.textContent = seconds ? `Hantar Semula OTP (${seconds}s)` : "Hantar Semula OTP";
    resendOtpButton.setAttribute("aria-disabled", String(seconds > 0 || otpBusy));
  }
  updateOtpControls();
  if (!seconds && resendTimer) {
    clearInterval(resendTimer);
    resendTimer = null;
  }
}
function startResendCountdown(seconds = 60) {
  resendUntil = Date.now() + seconds * 1000;
  if (resendTimer) clearInterval(resendTimer);
  tickResendCountdown();
  resendTimer = setInterval(tickResendCountdown, 250);
}
window.addEventListener("pageshow", tickResendCountdown);

emailInput?.addEventListener("input", () => {
  if (pendingEmail && emailInput.value.trim().toLowerCase() !== pendingEmail) {
    pendingEmail = null;
    otpInputs.forEach(input => { input.value = ""; });
    clearMessage();
    updateOtpControls();
  }
});

function fillOtpDigits(value, start = 0) {
  const digits = value.replace(/[^0-9]/g, "").slice(0, 6 - start);
  for (let i = start; i < 6; i++) otpInputs[i].value = digits[i - start] || "";
  otpInputs[Math.min(start + digits.length, 5)]?.focus();
}
otpInputs.forEach((input, index) => {
  input.addEventListener("input", () => {
    const digits = input.value.replace(/[^0-9]/g, "");
    if (digits.length > 1) fillOtpDigits(digits, index);
    else {
      input.value = digits;
      if (digits) otpInputs[index + 1]?.focus();
    }
  });
  input.addEventListener("paste", event => {
    const pasted = event.clipboardData?.getData("text") || "";
    if (!/[0-9]/.test(pasted)) return;
    event.preventDefault();
    fillOtpDigits(pasted, index);
  });
  input.addEventListener("keydown", event => {
    if (event.key === "Backspace" && !input.value && index > 0) {
      event.preventDefault();
      otpInputs[index - 1].value = "";
      otpInputs[index - 1].focus();
    }
    if (event.key === "ArrowLeft") otpInputs[index - 1]?.focus();
    if (event.key === "ArrowRight") otpInputs[index + 1]?.focus();
    if (event.key === "Enter") { event.preventDefault(); void verifyEmailOtp(); }
  });
});

async function requestEmailOtp() {
  if (otpBusy || Date.now() < resendUntil) return;
  clearMessage();
  const email = emailInput?.value.trim().toLowerCase();
  if (!isValidEmail(email)) {
    showMessage("Sila masukkan alamat email yang sah.", "error");
    emailInput?.focus();
    return;
  }
  if (!window.loginTurnstileToken) {
    showMessage("Sila lengkapkan pengesahan keselamatan dahulu.", "error");
    return;
  }
  otpBusy = true;
  updateOtpControls();
  try {
    const data = await callWorker("/api/send-otp", { email, turnstileToken: window.loginTurnstileToken });
    if (data?.success !== true) throw new Error(data?.message || "Gagal menghantar OTP.");
    pendingEmail = email;
    otpInputs.forEach(input => { input.value = ""; });
    startResendCountdown();
    showMessage("Kod OTP telah dihantar. Sila semak peti masuk atau folder spam email anda.", "success");
    otpInputs[0]?.focus();
  } catch (error) {
    showMessage(friendlyError(error), "error");
  } finally {
    otpBusy = false;
    resetLoginTurnstile();
    updateOtpControls();
  }
}
emailLoginForm?.addEventListener("submit", event => {
  event.preventDefault();
  void requestEmailOtp();
});
resendOtpButton?.addEventListener("click", requestEmailOtp);

async function verifyEmailOtp() {
  if (otpBusy) return;
  clearMessage();
  const email = emailInput?.value.trim().toLowerCase();
  const otp = otpInputs.map(input => input.value).join("");
  if (!pendingEmail || pendingEmail !== email) {
    showMessage("Sila minta kod OTP untuk email ini dahulu.", "error");
    return;
  }
  if (!/^[0-9]{6}$/.test(otp)) {
    showMessage("Sila masukkan kod OTP 6 digit.", "error");
    otpInputs.find(input => !input.value)?.focus();
    return;
  }
  otpBusy = true;
  updateOtpControls();
  try {
    const data = await callWorker("/api/verify-otp", { email, otp });
    if (data?.success !== true) throw new Error(data?.message || "Kod OTP salah atau telah tamat tempoh.");
    setSession(email, "otp", { verified: true });
    renderLoggedIn(email.split("@")[0]);
    showMessage("Email berjaya disahkan. Anda telah log masuk.", "success");
    pendingEmail = null;
    otpInputs.forEach(input => { input.value = ""; });
    void sendWelcomeEmailOnce(email, email.split("@")[0]);
  } catch (error) {
    showMessage(friendlyError(error), "error");
  } finally {
    otpBusy = false;
    updateOtpControls();
  }
}
verifyOtpButton?.addEventListener("click", verifyEmailOtp);
updateOtpControls();

/* =========================================
   MAGIC LINK
========================================= */

magicLinkButton?.addEventListener("click", async () => {
  if (otpBusy) return;
  clearMessage();

  if (!emailInput) {
    showMessage(
      "Borang log masuk tidak lengkap (medan e-mel tidak dijumpai).",
      "error"
    );
    return;
  }

  const email = emailInput.value.trim();

  if (!email) {
    showMessage("Sila masukkan alamat e-mel dahulu.", "error");
    return;
  }

  if (!isValidEmail(email)) {
    showMessage(
      "Format e-mel tidak sah. Contoh: nama@contoh.com",
      "error"
    );
    return;
  }

  if (!window.loginTurnstileToken) {
    showMessage("Sila lengkapkan pengesahan keselamatan.", "error");
    return;
  }

  otpBusy = true;
  updateOtpControls();
  setBusy(magicLinkButton, true);

  try {
    const data = await callWorker("/api/magic-link", {
      email,
      turnstileToken: window.loginTurnstileToken
    });

    if (data?.success) {
      showMessage(
        "Pautan log masuk telah dihantar ke e-mel anda. Semak peti masuk anda.",
        "success"
      );
    } else {
      showMessage(data?.message || "Gagal menghantar pautan.", "error");
    }
  } catch (error) {
    showMessage(friendlyError(error), "error");
  } finally {
    otpBusy = false;
    setBusy(magicLinkButton, false);
    resetLoginTurnstile();
    updateOtpControls();
  }
});


/* =========================================
   LOGOUT
========================================= */

async function logoutUser() {
  clearSession();
  pendingEmail = null;
  otpInputs.forEach(input => { input.value = ""; });
  renderLoggedOut();
  updateOtpControls();

  try {
    if (firebase && auth) await firebase.signOut(auth);
  } catch (error) {
    console.error("Logout failed:", error);
  }
}

logoutButton?.addEventListener("click", logoutUser);
window.logoutUser = logoutUser;


/* =========================================
   FIREBASE AUTH STATE
========================================= */

function renderAuthState(user) {
  if (user) {
    renderLoggedIn(user.displayName || user.email || "Pengguna");
    return;
  }
  const session = getSession();
  if (session) renderLoggedIn(session.email.split("@")[0]);
  else renderLoggedOut();
}
renderAuthState(null);
const firebaseReady = import("../firebase-config.js")
  .then(async module => {
    firebase = module;
    auth = module.auth;
    await module.authPersistenceReady;
    module.onAuthStateChanged(auth, renderAuthState);
    // Restore redirects independently of readiness for a new popup.
    void import("https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js")
      .then(module => module.getRedirectResult(auth))
      .then(result => {
        if (!result?.user) return;
        setSession(result.user.email, "google", { verified: result.user.emailVerified === true });
        renderAuthState(result.user);
        void sendWelcomeEmailOnce(result.user.email, result.user.displayName);
      })
      .catch(error => showMessage(friendlyError(error), "error"));
  })
  .catch(error => {
    firebaseLoadError = error;
    console.error("Google authentication could not initialize:", error);
  });
