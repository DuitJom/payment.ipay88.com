// auth/auth-page.js
// Controllers for the two standalone auth sub-pages:
//   page/register.html        -> registerForm
//   page/forgot-password.html -> forgotForm
//
// Both forms are progressive enhancements on top of real Firebase Auth calls,
// so the pages stay usable (and the browser's own validation still runs) if a
// script fails to load.

import {
  auth,
  authPersistenceReady,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile
} from "../firebase-config.js";

// ===== 1. ELEMENT REFERENCES =====
const registerForm     = document.getElementById("registerForm");
const registerName     = document.getElementById("registerName");
const registerEmail    = document.getElementById("registerEmail");
const registerPassword = document.getElementById("registerPassword");
const registerConfirm  = document.getElementById("registerConfirm");
const registerSubmit   = document.getElementById("registerSubmit");
const registerMessage  = document.getElementById("registerMessage");

const forgotForm       = document.getElementById("forgotForm");
const forgotEmail      = document.getElementById("forgotEmail");
const forgotSubmit     = document.getElementById("forgotSubmit");
const forgotMessage    = document.getElementById("forgotMessage");

// ===== 2. HELPERS =====
function showMessage(element, text, type, options) {
  if (!element) return;
  const opts = options || {};
  element.textContent = text || "";
  element.className = "auth-message is-" + (type || "info");
  // A persistent message must stay rendered even when its text is empty,
  // because it may carry a live region that assistive tech is watching.
  element.hidden = opts.keepVisible ? false : !text;
}

function clearMessage(element) {
  showMessage(element, "", "info");
}

function setBusy(button, busy) {
  if (!button) return;
  button.disabled = busy;
  button.setAttribute("aria-busy", busy ? "true" : "false");
}

function friendlyError(error) {
  const map = {
    "auth/email-already-in-use": "E-mel ini sudah didaftarkan. Sila log masuk atau set semula kata laluan anda.",
    "auth/invalid-email": "Alamat e-mel tidak sah.",
    "auth/weak-password": "Kata laluan terlalu lemah. Gunakan sekurang-kurangnya 6 aksara.",
    "auth/missing-password": "Sila masukkan kata laluan.",
    "auth/too-many-requests": "Terlalu banyak percubaan. Sila cuba lagi sebentar nanti.",
    "auth/network-request-failed": "Ralat sambungan. Sila periksa internet anda dan cuba lagi.",
    "auth/operation-not-allowed": "Pendaftaran e-mel belum diaktifkan. Sila hubungi Pasukan Sokongan DuitJom.",
    "auth/unauthorized-continue-uri": "Domain ini belum dibenarkan untuk pautan set semula kata laluan."
  };
  return map[error?.code] || "Ralat: " + (error?.message || error);
}

// Turnstile is verified server-side; on the client we only make sure that a
// widget which actually rendered has produced a token before submitting.
function turnstileBlocked(token) {
  return Boolean(window.turnstile) && !token;
}

// A Turnstile token is single-use and expires after roughly 300 seconds, so the
// widget has to be reset after every attempt that consumed its token.
function resetTurnstile(containerSelector) {
  const widget = document.querySelector(containerSelector);
  if (!widget || !window.turnstile) return;
  try {
    window.turnstile.reset(widget);
  } catch (error) {
    console.warn("Turnstile tidak dapat direset:", error);
  }
}

// ===== 3. CLOUDFLARE TURNSTILE CALLBACKS =====
window.registerTurnstileToken = null;
window.forgotTurnstileToken = null;

window.onRegisterTurnstileSuccess = function (token) {
  window.registerTurnstileToken = token;
};
window.onRegisterTurnstileError = function (errorCode) {
  console.error("Turnstile (Daftar) ralat:", errorCode);
  window.registerTurnstileToken = null;
};
window.onRegisterTurnstileExpired = function () {
  window.registerTurnstileToken = null;
};

window.onForgotTurnstileSuccess = function (token) {
  window.forgotTurnstileToken = token;
};
window.onForgotTurnstileError = function (errorCode) {
  console.error("Turnstile (Lupa Kata Laluan) ralat:", errorCode);
  window.forgotTurnstileToken = null;
};
window.onForgotTurnstileExpired = function () {
  window.forgotTurnstileToken = null;
};

// ===== 4. REGISTER ACCOUNT =====
registerForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage(registerMessage);

  const name = registerName?.value.trim() || "";
  const email = registerEmail?.value.trim().toLowerCase() || "";
  const password = registerPassword?.value || "";
  const confirmation = registerConfirm?.value || "";

  if (!name) {
    showMessage(registerMessage, "Sila masukkan nama penuh anda.", "error");
    registerName?.focus();
    return;
  }
  if (!email) {
    showMessage(registerMessage, "Sila masukkan alamat e-mel anda.", "error");
    registerEmail?.focus();
    return;
  }
  if (password.length < 6) {
    showMessage(registerMessage, "Kata laluan mesti sekurang-kurangnya 6 aksara.", "error");
    registerPassword?.focus();
    return;
  }
  if (password !== confirmation) {
    showMessage(registerMessage, "Kata laluan dan pengesahan tidak sepadan.", "error");
    registerConfirm?.focus();
    return;
  }
  // Deliberately checked AFTER the local field validation above, so a
  // single-use token is never spent on a request that fails immediately.
  if (turnstileBlocked(window.registerTurnstileToken)) {
    showMessage(registerMessage, "Sila lengkapkan pengesahan keselamatan terlebih dahulu.", "error");
    return;
  }

  setBusy(registerSubmit, true);
  try {
    await authPersistenceReady;
    const credential = await createUserWithEmailAndPassword(auth, email, password);

    if (name) {
      try {
        await updateProfile(credential.user, { displayName: name });
      } catch (error) {
        console.warn("Nama paparan tidak dapat disimpan:", error);
      }
    }

    // Best-effort: verification e-mail must never block a successful sign-up.
    try {
      await sendEmailVerification(credential.user);
    } catch (error) {
      console.warn("E-mel pengesahan tidak dapat dihantar:", error);
    }

    showMessage(
      registerMessage,
      "Akaun anda berjaya dicipta. Sila semak e-mel anda untuk pengesahan. Anda akan dibawa ke halaman log masuk...",
      "success"
    );
    registerForm.reset();
    resetTurnstile("#registerForm .cf-turnstile");

    window.setTimeout(() => {
      window.location.href = "../index.html";
    }, 3000);
  } catch (error) {
    console.error("Pendaftaran gagal:", error);
    showMessage(registerMessage, friendlyError(error), "error");
  } finally {
    setBusy(registerSubmit, false);
  }
});

// Mirror the values the login screen expects while the user is typing.
registerConfirm?.addEventListener("input", () => {
  if (!registerConfirm.value || !registerPassword?.value) {
    registerConfirm.setCustomValidity("");
    return;
  }
  registerConfirm.setCustomValidity(
    registerConfirm.value === registerPassword.value ? "" : "Kata laluan tidak sepadan."
  );
});

// ===== 5. FORGOT PASSWORD =====
forgotForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage(forgotMessage);

  const email = forgotEmail?.value.trim().toLowerCase() || "";

  if (!email) {
    showMessage(forgotMessage, "Sila masukkan alamat e-mel berdaftar anda.", "error");
    forgotEmail?.focus();
    return;
  }
  if (turnstileBlocked(window.forgotTurnstileToken)) {
    showMessage(forgotMessage, "Sila lengkapkan pengesahan keselamatan terlebih dahulu.", "error");
    return;
  }

  setBusy(forgotSubmit, true);
  try {
    await authPersistenceReady;
    await sendPasswordResetEmail(auth, email, {
      url: window.location.origin + "/index.html",
      handleCodeInApp: false
    });

    resetTurnstile("#forgotForm .cf-turnstile");
    showMessage(
      forgotMessage,
      "Pautan set semula kata laluan telah dihantar ke " + email + ". Sila semak peti masuk (dan folder spam) anda.",
      "success"
    );
    forgotForm.reset();
  } catch (error) {
    console.error("Set semula kata laluan gagal:", error);
    // Never reveal whether an address is registered — report success-shaped
    // guidance for user-not-found instead of leaking account existence.
    if (error?.code === "auth/user-not-found") {
      resetTurnstile("#forgotForm .cf-turnstile");
      showMessage(
        forgotMessage,
        "Jika e-mel ini berdaftar, pautan set semula telah dihantar. Sila semak peti masuk anda.",
        "success"
      );
    } else {
      showMessage(forgotMessage, friendlyError(error), "error");
    }
  } finally {
    setBusy(forgotSubmit, false);
  }
});
