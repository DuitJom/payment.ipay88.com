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
const WORKER_TIMEOUT_MS = 1e4;

const SESSION_KEY = "duitjom_session";
const SESSION_MAX_AGE_MS = 10080 * 60 * 1e3;

const WELCOMED_PREFIX = "duitjom_welcomed_";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;


/* =========================================
   MESSAGE
========================================= */

function showMessage(text, type = "info") {
  if (messageBox) {
    messageBox.textContent = text;

    messageBox.classList.remove(
      "info",
      "success",
      "error",
      "warning"
    );

    messageBox.classList.add(type);
    messageBox.hidden = false;
  }
}

function clearMessage() {
  if (messageBox) {
    messageBox.textContent = "";
    messageBox.hidden = true;
  }
}


/* =========================================
   BUTTON / BUSY STATE
========================================= */

function setBusy(element, busy) {
  if (element) {
    element.disabled = busy;
    element.classList.toggle("is-busy", busy);
  }
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

  return (
    map[error?.code] ||
    `Ralat: ${error?.message || error}`
  );
}


/* =========================================
   PANEL VISIBILITY
========================================= */

function setPanelVisible(panel, visible) {
  if (panel) {
    panel.hidden = !visible;
    panel.classList.toggle("hidden", !visible);
  }
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

    if (!raw) {
      return null;
    }

    const session = JSON.parse(raw);

    if (!session || typeof session !== "object") {
      return null;
    }

    const loginAt = Number(session.loginAt);

    if (
      !Number.isFinite(loginAt) ||
      Date.now() - loginAt > SESSION_MAX_AGE_MS
    ) {
      clearSession();
      return null;
    }

    return session;

  } catch (e) {
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
  if (auth?.currentUser) {
    return true;
  }

  const session = getSession();

  return !!(
    session &&
    session.verified === true
  );
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
    const res = await fetch(
      WORKER_URL + endpoint,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify(body),

        signal: controller.signal
      }
    );

    if (!res.ok) {
      throw new Error(
        `HTTP ${res.status} ${res.statusText || ""}`.trim()
      );
    }

    return await res.json();

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
  if (!email) {
    return false;
  }

  const key =
    WELCOMED_PREFIX +
    String(email).toLowerCase();

  try {
    if (localStorage.getItem(key)) {
      return false;
    }
  } catch (e) {
    // Ignore localStorage error
  }

  try {
    await callWorker(
      "/api/welcome",
      {
        email,
        name
      }
    );

  } catch (err) {
    console.error(
      "Welcome email failed:",
      err
    );
  }

  try {
    localStorage.setItem(
      key,
      String(Date.now())
    );
  } catch (error) {
    console.warn(
      "Tanda welcome email tidak dapat disimpan:",
      error
    );
  }

  return true;
}


/* =========================================
   TURNSTILE
========================================= */

function resetLoginTurnstile() {
  window.loginTurnstileToken = null;

  const widget = document.querySelector(
    "#emailLoginForm .cf-turnstile"
  );

  if (widget && window.turnstile) {
    try {
      window.turnstile.reset(widget);
    } catch (error) {
      console.warn(
        "Turnstile tidak dapat direset:",
        error
      );
    }
  }

  if (window.turnstile) {
    const btn =
      document.getElementById(
        "emailLoginButton"
      );

    if (btn) {
      btn.disabled = true;
    }
  }
}


/* =========================================
   LOGIN / LOGOUT PANEL
========================================= */

function renderLoggedIn(displayName) {
  setPanelVisible(loginPanel, false);
  setPanelVisible(userPanel, true);

  if (userInfo) {
    userInfo.textContent = displayName;
  }

  if (authUserLabel) {
    authUserLabel.textContent = displayName;
  }

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

  if (paymentActionPanel) {
    paymentActionPanel.classList.add(
      "hidden"
    );
  }

  if (authUserLabel) {
    authUserLabel.textContent = "";
  }

  if (userInfo) {
    userInfo.textContent = "";
  }
}


/* =========================================
   POPUP SUPPORT CHECK
========================================= */

function isPopupUnsupported(error) {
  const code = error?.code || "";

  if (
    code === "auth/popup-blocked" ||
    code ===
      "auth/operation-not-supported-in-this-environment"
  ) {
    return true;
  }

  const ua = navigator.userAgent || "";

  return (
    /Android|iPhone|iPad|iPod|Mobile/i.test(ua) &&
    (
      code === "auth/popup-closed-by-user" ||
      code === "auth/cancelled-popup-request"
    )
  );
}


/* =========================================
   GOOGLE LOGIN
========================================= */

googleLoginButton?.addEventListener(
  "click",
  async () => {

    clearMessage();
    setBusy(googleLoginButton, true);

    try {
      await authPersistenceReady;

      const result =
        await signInWithPopup(
          auth,
          googleProvider
        );

      const email =
        result.user.email;

      const name =
        result.user.displayName ||
        (
          email
            ? email.split("@")[0]
            : "Pengguna"
        );

      setSession(
        email,
        "google",
        {
          verified: true
        }
      );

      await sendWelcomeEmailOnce(
        email,
        name
      );

    } catch (error) {

      if (isPopupUnsupported(error)) {

        try {
          await signInWithRedirect(
            auth,
            googleProvider
          );

          return;

        } catch (redirectError) {
          showMessage(
            friendlyError(redirectError),
            "error"
          );
        }

      } else {
        showMessage(
          friendlyError(error),
          "error"
        );
      }

    } finally {
      setBusy(
        googleLoginButton,
        false
      );
    }
  }
);


/* =========================================
   GOOGLE REDIRECT RESULT
========================================= */

authPersistenceReady
  .then(() => getRedirectResult(auth))

  .then(async (result) => {

    if (!result?.user) {
      return;
    }

    const email =
      result.user.email;

    const name =
      result.user.displayName ||
      (
        email
          ? email.split("@")[0]
          : "Pengguna"
      );

    setSession(
      email,
      "google",
      {
        verified: true
      }
    );

    await sendWelcomeEmailOnce(
      email,
      name
    );
  })

  .catch((error) => {
    if (error?.code) {
      showMessage(
        friendlyError(error),
        "error"
      );
    }
  });


/* =========================================
   EMAIL OTP LOGIN
========================================= */

emailLoginForm?.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();
    clearMessage();

    if (!emailInput) {
      showMessage(
        "Borang log masuk tidak lengkap (medan e-mel tidak dijumpai).",
        "error"
      );

      return;
    }

    const email =
      emailInput.value.trim();

    if (!email) {
      showMessage(
        "Sila masukkan alamat e-mel.",
        "error"
      );

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
      showMessage(
        "Sila lengkapkan pengesahan keselamatan.",
        "error"
      );

      return;
    }

    const submitBtn =
      emailLoginForm.querySelector(
        "button[type=submit]"
      );

    setBusy(
      submitBtn,
      true
    );

    try {
      const data =
        await callWorker(
          "/api/send-otp",
          {
            email,
            turnstileToken:
              window.loginTurnstileToken
          }
        );

      if (data.success) {

        showMessage(
          "Kod OTP telah dihantar ke e-mel anda.",
          "success"
        );

        if (
          typeof window.showOTPOverlay ===
          "function"
        ) {
          window.showOTPOverlay(email);

        } else {
          console.warn(
            "showOTPOverlay() tidak tersedia — overlay OTP tidak dipaparkan."
          );
        }

        window.onOTPVerified =
          async function () {

            setSession(
              email,
              "otp",
              {
                verified: true
              }
            );

            await sendWelcomeEmailOnce(
              email,
              email.split("@")[0]
            );

            window.location.href =
              "/dashboard.html";
          };

      } else {
        showMessage(
          data.message ||
            "Gagal menghantar OTP.",
          "error"
        );
      }

    } catch (err) {
      showMessage(
        friendlyError(err),
        "error"
      );

    } finally {
      setBusy(
        submitBtn,
        false
      );

      resetLoginTurnstile();
    }
  }
);


/* =========================================
   MAGIC LINK
========================================= */

magicLinkButton?.addEventListener(
  "click",
  async () => {

    clearMessage();

    if (!emailInput) {
      showMessage(
        "Borang log masuk tidak lengkap (medan e-mel tidak dijumpai).",
        "error"
      );

      return;
    }

    const email =
      emailInput.value.trim();

    if (!email) {
      showMessage(
        "Sila masukkan alamat e-mel dahulu.",
        "error"
      );

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
      showMessage(
        "Sila lengkapkan pengesahan keselamatan.",
        "error"
      );

      return;
    }

    setBusy(
      magicLinkButton,
      true
    );

    try {
      const data =
        await callWorker(
          "/api/magic-link",
          {
            email,
            turnstileToken:
              window.loginTurnstileToken
          }
        );

      if (data.success) {
        showMessage(
          "Pautan log masuk telah dihantar ke e-mel anda. Semak peti masuk anda.",
          "success"
        );

      } else {
        showMessage(
          data.message ||
            "Gagal menghantar pautan.",
          "error"
        );
      }

    } catch (err) {
      showMessage(
        friendlyError(err),
        "error"
      );

    } finally {
      setBusy(
        magicLinkButton,
        false
      );

      resetLoginTurnstile();
    }
  }
);


/* =========================================
   LOGOUT BUTTON
========================================= */

logoutButton?.addEventListener(
  "click",
  async () => {

    clearSession();
    renderLoggedOut();

    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
  }
);


/* =========================================
   GLOBAL LOGOUT FUNCTION
========================================= */

window.logoutUser =
  async function () {

    clearSession();
    renderLoggedOut();

    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
  };


/* =========================================
   FIREBASE AUTH STATE
========================================= */

const unsubscribeAuthState =
  onAuthStateChanged(
    auth,
    (user) => {

      const otpSession =
        getSession();

      if (user) {
        renderLoggedIn(
          user.displayName ||
          user.email ||
          "Pengguna"
        );

        return;
      }

      if (otpSession) {
        renderLoggedIn(
          otpSession.email ||
          "Pengguna"
        );

        return;
      }

      renderLoggedOut();
    }
  );


/* =========================================
   CLEANUP
========================================= */

window.addEventListener(
  "pagehide",
  () => {

    try {
      unsubscribeAuthState?.();
    } catch (error) {
      console.warn(
        "Gagal unsubscribe onAuthStateChanged:",
        error
      );
    }
  }
);