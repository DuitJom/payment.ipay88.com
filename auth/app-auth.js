// auth/app-auth.js

// ===== 1. IMPORT (paling atas) =====
import {
  auth,
  authPersistenceReady,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from "../firebase-config.js";

// ===== 2. RUJUKAN ELEMEN HTML (sesuaikan id dengan index.html) =====
const googleLoginButton   = document.getElementById("googleLoginButton");
const emailToggleButton   = document.getElementById("emailToggleButton");
const emailLoginForm      = document.getElementById("emailLoginForm");
const emailInput          = document.getElementById("emailInput");
const passwordInput       = document.getElementById("passwordInput");
const forgotPasswordLink  = document.getElementById("forgotPasswordButton");
const showRegisterLink    = document.getElementById("registerToggleButton");
const emailRegisterForm   = document.getElementById("emailRegisterForm");
const registerEmail       = document.getElementById("registerEmailInput");
const registerPassword    = document.getElementById("registerPasswordInput");
const registerConfirm     = document.getElementById("registerConfirmInput");
const backToLoginButton   = document.getElementById("backToLoginButton");
const logoutButton        = document.getElementById("logoutButton");
const loginPanel          = document.getElementById("authLoginPanel");
const userPanel           = document.getElementById("authUserPanel");
const userInfo            = document.getElementById("userDisplay");
const messageBox          = document.getElementById("authMessage");

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
    "auth/invalid-email": "Format e-mel tidak sah.",
    "auth/user-not-found": "Akaun tidak dijumpai.",
    "auth/wrong-password": "Kata laluan salah.",
    "auth/invalid-credential": "E-mel atau kata laluan salah.",
    "auth/email-already-in-use": "E-mel ini sudah didaftarkan.",
    "auth/weak-password": "Kata laluan terlalu lemah (minimum 6 aksara).",
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

function showLoginForm(focus = false) {
  setPanelVisible(emailRegisterForm, false);
  setPanelVisible(emailLoginForm, true);
  showRegisterLink?.setAttribute("aria-expanded", "false");
  emailToggleButton?.setAttribute("aria-expanded", "true");
  clearMessage();
  if (focus) emailInput?.focus({ preventScroll: true });
}

function showRegisterForm() {
  setPanelVisible(emailLoginForm, false);
  setPanelVisible(emailRegisterForm, true);
  showRegisterLink?.setAttribute("aria-expanded", "true");
  emailToggleButton?.setAttribute("aria-expanded", "false");
  clearMessage();
  registerEmail?.focus({ preventScroll: true });
}

// ===== 4. EVENT LISTENERS =====
showLoginForm();
emailToggleButton?.addEventListener("click", () => showLoginForm(true));

// --- (a) Google Sign-In  ← KOD PERTAMA ANDA DI SINI ---
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

// --- (b) Log masuk e-mel  ← KOD KEDUA ANDA DI SINI (dalam try) ---
emailLoginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage();
  const submitBtn = emailLoginForm.querySelector("button[type=submit]");
  setBusy(submitBtn, true);
  try {
    await authPersistenceReady;
    await signInWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value);
  } catch (error) {
    showMessage(friendlyError(error), "error");
  } finally {
    setBusy(submitBtn, false);
  }
});

// --- (c) Lupa kata laluan ---
forgotPasswordLink?.addEventListener("click", async (event) => {
  event.preventDefault();
  clearMessage();
  const email = emailInput?.value.trim();
  if (!email) {
    showMessage("Masukkan e-mel anda dahulu, kemudian klik Forgot Password.", "error");
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    showMessage("E-mel set semula kata laluan telah dihantar. Semak peti masuk/spam.", "success");
  } catch (error) {
    showMessage(friendlyError(error), "error");
  }
});

// --- (d) Tukar ke borang daftar / kembali ---
showRegisterLink?.addEventListener("click", (event) => {
  event.preventDefault();
  showRegisterForm();
});

backToLoginButton?.addEventListener("click", (event) => {
  event.preventDefault();
  showLoginForm(true);
});

// --- (e) Daftar akaun ---
emailRegisterForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage();
  const email = registerEmail.value.trim();
  const pass = registerPassword.value;
  const confirm = registerConfirm.value;

  if (pass !== confirm) {
    showMessage("Kata laluan dan pengesahan tidak sepadan.", "error");
    return;
  }

  const submitBtn = emailRegisterForm.querySelector("button[type=submit]");
  setBusy(submitBtn, true);
  try {
    await authPersistenceReady;
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await sendEmailVerification(cred.user);
    emailRegisterForm.reset();
    showLoginForm();
    showMessage("Akaun berjaya didaftar. E-mel pengesahan telah dihantar.", "success");
  } catch (error) {
    showMessage(friendlyError(error), "error");
  } finally {
    setBusy(submitBtn, false);
  }
});

// --- (f) Log keluar ---
logoutButton?.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    showMessage(friendlyError(error), "error");
  }
});

// ===== 5. PANTAU STATUS LOGIN (paling bawah) =====
onAuthStateChanged(auth, (user) => {
  if (user) {
    setPanelVisible(loginPanel, false);
    setPanelVisible(userPanel, true);
    if (userInfo) {
      userInfo.textContent = `${user.displayName || user.email}${user.emailVerified ? "" : " (e-mel belum disahkan)"}`;
    }
  } else {
    setPanelVisible(userPanel, false);
    setPanelVisible(loginPanel, true);
    // Preserve a Register form opened while the first auth check was loading.
    if (emailRegisterForm?.hidden !== false) showLoginForm();
  }
});
