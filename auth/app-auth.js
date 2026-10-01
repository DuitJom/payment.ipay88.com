The file is syntactically valid, but it has several runtime and state-handling problems. The most significant are that Turnstile’s `reset()` was given a DOM element instead of a widget ID, failed welcome-email requests were still marked as sent, and an OTP callback was registered only after the OTP overlay was opened. Session validation also accepted unverified or future-dated sessions.

Here is a corrected version of `auth/app-auth.js`:

```javascript
import {
  auth,
  authPersistenceReady,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "../firebase-config.js";

import {
  signInWithRedirect,
  getRedirectResult
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

const googleLoginButton = document.getElementById("googleLoginButton");
const emailToggleButton = document.getElementById("emailToggleButton");
const emailLoginForm = document.getElementById("emailLoginForm");
const emailInput = document.getElementById("emailInput");
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
        `Worker returned an invalid response (HTTP ${response.status}).`
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
    await callWorker("/api/welcome", { email, name });
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
      window.turnstile.reset();
    } catch (error) {
      console.warn("Turnstile tidak dapat direset:", error);
    }
  }

  const button = document.getElementById("emailLoginButton");
  if (button) {
    button.disabled = true;
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
});


/* =========================================
   POPUP SUPPORT CHECK
========================================= */

function isPopupUnsupported(error) {
  const code = error?.code || "";

  if (
    code === "auth/popup-blocked" ||
    code === "auth/operation-not-supported-in-this-environment"
  ) {
    return true;
  }

  const userAgent = navigator.userAgent || "";

  return (
    /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent) &&
    (
      code === "auth/popup-closed-by-user" ||
      code === "auth/cancelled-popup-request"
    )
  );
}


/* =========================================
   GOOGLE LOGIN
========================================= */

googleLoginButton?.addEventListener("click", async () => {
  clearMessage();
  setBusy(googleLoginButton, true);

  try {
    await authPersistenceReady;

    const result = await signInWithPopup(auth, googleProvider);
    const email = result.user.email;
    const name =
      result.user.displayName ||
      (email ? email.split("@")[0] : "Pengguna");

    setSession(email, "google", { verified: true });
    await sendWelcomeEmailOnce(email, name);
  } catch (error) {
    if (isPopupUnsupported(error)) {
      try {
        await signInWithRedirect(auth, googleProvider);
        return;
      } catch (redirectError) {
        showMessage(friendlyError(redirectError), "error");
      }
    } else {
      showMessage(friendlyError(error), "error");
    }
  } finally {
    setBusy(googleLoginButton, false);
  }
});


/* =========================================
   GOOGLE REDIRECT RESULT
========================================= */

authPersistenceReady
  .then(() => getRedirectResult(auth))
  .then(async (result) => {
    if (!result?.user) return;

    const email = result.user.email;
    const name =
      result.user.displayName ||
      (email ? email.split("@")[0] : "Pengguna");

    setSession(email, "google", { verified: true });
    await sendWelcomeEmailOnce(email, name);
  })
  .catch((error) => {
    if (error?.code) {
      showMessage(friendlyError(error), "error");
    }
  });


/* =========================================
   EMAIL OTP LOGIN
========================================= */

emailLoginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
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
    showMessage("Sila masukkan alamat e-mel.", "error");
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

  const submitButton = emailLoginForm.querySelector(
    'button[type="submit"]'
  );

  setBusy(submitButton, true);

  try {
    const data = await callWorker("/api/send-otp", {
      email,
      turnstileToken: window.loginTurnstileToken
    });

    if (!data?.success) {
      showMessage(data?.message || "Gagal menghantar OTP.", "error");
      return;
    }

    showMessage("Kod OTP telah dihantar ke e-mel anda.", "success");

    // Register the callback before opening the overlay, in case the
    // overlay invokes it immediately.
    let verificationHandled = false;

    window.onOTPVerified = async () => {
      if (verificationHandled) return;
      verificationHandled = true;

      setSession(email, "otp", { verified: true });
      await sendWelcomeEmailOnce(email, email.split("@")[0]);
      window.location.href = "/dashboard.html";
    };

    if (typeof window.showOTPOverlay === "function") {
      window.showOTPOverlay(email);
    } else {
      console.warn(
        "showOTPOverlay() tidak tersedia — overlay OTP tidak dipaparkan."
      );
    }
  } catch (error) {
    showMessage(friendlyError(error), "error");
  } finally {
    setBusy(submitButton, false);
    resetLoginTurnstile();
  }
});


/* =========================================
   MAGIC LINK
========================================= */

magicLinkButton?.addEventListener("click", async () => {
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
    setBusy(magicLinkButton, false);
    resetLoginTurnstile();
  }
});


/* =========================================
   LOGOUT
========================================= */

async function logoutUser() {
  clearSession();
  renderLoggedOut();

  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout failed:", error);
  }
}

logoutButton?.addEventListener("click", logoutUser);
window.logoutUser = logoutUser;


/* =========================================
   FIREBASE AUTH STATE
========================================= */

onAuthStateChanged(auth, (user) => {
  if (user) {
    renderLoggedIn(
      user.displayName ||
      user.email ||
      "Pengguna"
    );
    return;
  }

  const session = getSession();

  if (session) {
    renderLoggedIn(session.email || "Pengguna");
    return;
  }

  renderLoggedOut();
});
```

### What was fixed

- **Turnstile reset:** `turnstile.reset(widget)` passed an HTML element where Turnstile expects a widget ID. The corrected code resets the implicitly rendered widget with `reset()`.
- **Welcome-email retries:** Failed requests were previously recorded as already sent. The code now records the “sent” marker only after the worker request succeeds.
- **OTP callback timing:** `window.onOTPVerified` is now set before opening the OTP overlay, avoiding a race if the overlay calls the callback immediately.
- **Session validation:** Sessions must now be verified, contain an email, and have a valid, non-future timestamp within the allowed age. Invalid sessions are cleared.
- **Worker response handling:** Invalid JSON responses and unsuccessful HTTP responses now produce useful errors instead of failing later when `data.success` is accessed.
- **Unused email toggle:** The existing `emailToggleButton` now toggles the email form and updates `aria-expanded`.
- **Auth listener cleanup:** The `pagehide` unsubscribe was removed. Unsubscribing during page navigation can leave the listener inactive if the page is restored from the browser’s back-forward cache.

Client-side session flags are only suitable for displaying UI. Any protected operation—such as payments—must also validate the user on the server.