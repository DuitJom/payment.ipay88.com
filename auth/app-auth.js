import {
  loginWithEmail, registerWithEmail, sendVerificationEmail, refreshCurrentUser,
  resetPassword, sendMagicLink, isMagicLink, completeMagicLink,
  ensureUserProfile, logOut, monitorAuthState, getFriendlyAuthError
} from "../auth.js";

const container = document.getElementById("firebaseAuthContainer");
const loginPanel = document.getElementById("authLoginPanel");
const userPanel = document.getElementById("authUserPanel");
const messageEl = document.getElementById("authMessage");
const emailForm = document.getElementById("emailLoginForm");
const emailButton = document.getElementById("emailLoginButton");
let currentUser = null;
let isVerified = false;

function message(text, type = "info") {
  if (!messageEl) return;
  messageEl.textContent = text || "";
  messageEl.classList.remove("text-red-600", "text-emerald-600");
  if (text) messageEl.classList.add(type === "error" ? "text-red-600" : "text-emerald-600");
}
window.setAuthMessage = message;
const friendly = (error) => getFriendlyAuthError(error);

function createPanels() {
  if (!container || document.getElementById("authRegisterPanel")) return;
  container.insertAdjacentHTML("beforeend", \`<div id="authRegisterPanel" class="login-card hidden">
    <p class="login-kicker">AKAUN BAHARU</p><h2 class="login-title">Daftar Akaun</h2>
    <form id="registerForm" class="login-panel">
      <label for="registerNameInput">Nama</label><input id="registerNameInput" type="text" autocomplete="name" required>
      <label for="registerEmailInput" class="mt-3">Email</label><input id="registerEmailInput" type="email" autocomplete="email" required>
      <label for="registerPasswordInput" class="mt-3">Password</label><input id="registerPasswordInput" type="password" minlength="6" autocomplete="new-password" required>
      <label for="registerConfirmInput" class="mt-3">Confirm Password</label><input id="registerConfirmInput" type="password" minlength="6" autocomplete="new-password" required>
      <button id="registerButton" type="submit" class="login-primary-button mt-4">Daftar</button>
    </form><button id="backToLoginFromRegister" type="button" class="login-secondary-button mt-3 w-full">Kembali ke Log Masuk</button>
  </div>
  <div id="authResetPanel" class="login-card hidden"><p class="login-kicker">PEMULIHAN AKAUN</p><h2 class="login-title">Lupa Kata Laluan?</h2>
    <form id="resetForm" class="login-panel"><label for="resetEmailInput">Email</label><input id="resetEmailInput" type="email" autocomplete="email" required>
      <button id="resetButton" type="submit" class="login-primary-button mt-4">Hantar Email Reset</button>
    </form><button id="backToLoginFromReset" type="button" class="login-secondary-button mt-3 w-full">Kembali ke Log Masuk</button>
  </div>
  <div id="authMagicPanel" class="login-card hidden"><p class="login-kicker">MAGIC LINK</p><h2 class="login-title">Log Masuk Tanpa Password</h2>
    <form id="magicLinkForm" class="login-panel"><label for="magicLinkEmailInput">Email</label><input id="magicLinkEmailInput" type="email" autocomplete="email" required>
      <button id="magicLinkButton" type="submit" class="login-primary-button mt-4">Hantar Pautan</button>
    </form><button id="backToLoginFromMagic" type="button" class="login-secondary-button mt-3 w-full">Kembali ke Log Masuk</button>
  </div>
  <div id="authVerificationPanel" class="login-card hidden"><p class="login-kicker">PENGESAHAN EMAIL</p><h2 class="login-title">Sahkan Email Anda</h2>
    <p class="login-subtitle">Sila semak inbox dan tekan pautan pengesahan sebelum meneruskan.</p>
    <button id="resendVerificationButton" type="button" class="login-primary-button mt-4">Hantar Semula Email</button>
    <button id="refreshVerificationButton" type="button" class="login-secondary-button mt-2 w-full">Saya Sudah Sahkan Email</button>
    <button id="logoutVerificationButton" type="button" class="login-secondary-button mt-2 w-full">Log Keluar</button>
  </div>\`);
  emailForm?.insertAdjacentHTML("afterend", \`<div class="mt-3 grid grid-cols-2 gap-2"><button id="forgotPasswordButton" type="button" class="login-secondary-button">Lupa Kata Laluan?</button><button id="openRegisterButton" type="button" class="login-secondary-button">Daftar Akaun</button></div><button id="openMagicLinkButton" type="button" class="login-secondary-button mt-2 w-full">Log Masuk Tanpa Kata Laluan</button>\`);
}

function showPanel(panel) {
  [loginPanel, userPanel, "authRegisterPanel", "authResetPanel", "authMagicPanel", "authVerificationPanel"].forEach((item) => {
    const node = typeof item === "string" ? document.getElementById(item) : item;
    node?.classList.toggle("hidden", node !== panel);
  });
}

function updateAuthState(user) {
  currentUser = user || null;
  isVerified = Boolean(user?.emailVerified);
  window.duitjomAuthState = { user: currentUser, isVerified };
  const name = user?.displayName || user?.email || "";
  showPanel(!user ? loginPanel : isVerified ? userPanel : document.getElementById("authVerificationPanel"));
  document.getElementById("btnPembayaranPinjaman")?.classList.toggle("hidden", !isVerified);
  document.getElementById("sidebarGoogleSection")?.classList.toggle("hidden", isVerified);
  document.getElementById("sidebarAccountSection")?.classList.toggle("hidden", !isVerified);
  document.querySelectorAll("[data-auth-user-name]").forEach((el) => { el.textContent = name; });
  document.getElementById("authUserLabel")?.replaceChildren(document.createTextNode(name));
  document.getElementById("userDisplay")?.replaceChildren(document.createTextNode(name));
  if (user && !isVerified) message("Sila sahkan email anda dahulu sebelum menggunakan fungsi pembayaran.");
  else if (!user) message("");
  if (isVerified) ensureUserProfile(user).catch((error) => console.warn("Profil Firestore belum disimpan:", error));
}

async function login(event) {
  event.preventDefault(); emailButton.disabled = true;
  try { await loginWithEmail(document.getElementById("emailInput").value.trim(), document.getElementById("passwordInput").value); }
  catch (error) { message(friendly(error), "error"); }
  finally { emailButton.disabled = false; }
}
async function register(event) {
  event.preventDefault();
  const password = document.getElementById("registerPasswordInput").value;
  if (password !== document.getElementById("registerConfirmInput").value) return message("Password dan confirm password tidak sepadan.", "error");
  const button = document.getElementById("registerButton"); button.disabled = true;
  try {
    const result = await registerWithEmail(document.getElementById("registerNameInput").value.trim(), document.getElementById("registerEmailInput").value.trim().toLowerCase(), password);
    await sendVerificationEmail(result.user); updateAuthState(result.user); message("Akaun berjaya dibuat. Sila semak email untuk pengesahan.");
  } catch (error) { message(friendly(error), "error"); } finally { button.disabled = false; }
}
async function reset(event) {
  event.preventDefault(); const button = document.getElementById("resetButton"); button.disabled = true;
  try { await resetPassword(document.getElementById("resetEmailInput").value.trim().toLowerCase()); showPanel(loginPanel); message("Email reset kata laluan telah dihantar. Sila semak inbox anda."); }
  catch (error) { message(friendly(error), "error"); } finally { button.disabled = false; }
}
async function magicLink(event) {
  event.preventDefault(); const button = document.getElementById("magicLinkButton"); button.disabled = true;
  const email = document.getElementById("magicLinkEmailInput").value.trim().toLowerCase();
  try { await sendMagicLink(email, { url: window.DUITJOM_AUTH_REDIRECT_URL || window.location.href, handleCodeInApp: true }); window.localStorage.setItem("emailForSignIn", email); message("Magic Link telah dihantar. Sila semak inbox anda."); }
  catch (error) { message(friendly(error), "error"); } finally { button.disabled = false; }
}
async function finishMagicLink() {
  if (!isMagicLink(window.location.href)) return;
  const email = window.localStorage.getItem("emailForSignIn") || window.prompt("Masukkan email yang menerima Magic Link:");
  if (!email) return message("Email diperlukan untuk melengkapkan Magic Link.", "error");
  try { await completeMagicLink(email.trim().toLowerCase(), window.location.href); window.localStorage.removeItem("emailForSignIn"); window.history.replaceState({}, document.title, window.location.pathname); }
  catch (error) { message(friendly(error), "error"); }
}
async function refreshVerification() {
  try { const user = await refreshCurrentUser(); updateAuthState(user); message(user?.emailVerified ? "Email berjaya disahkan. Anda boleh meneruskan." : "Status belum berubah. Sila tekan pautan dalam email dahulu.", user?.emailVerified ? "info" : "error"); }
  catch (error) { message(friendly(error), "error"); }
}
async function resendVerification() {
  try { await sendVerificationEmail(currentUser); message("Email pengesahan telah dihantar semula."); }
  catch (error) { message(friendly(error), "error"); }
}
async function sidebarLogin(event) {
  event.preventDefault();
  try { await loginWithEmail(document.getElementById("userEmail").value.trim(), document.getElementById("userPassword").value); }
  catch (error) { const text = friendly(error); document.getElementById("sidebarAuthMessage").textContent = text; message(text, "error"); }
}
function bindSidebar() {
  const form = document.getElementById("sidebarEmailLoginForm");
  if (form && !form.dataset.bound) { form.addEventListener("submit", sidebarLogin); form.dataset.bound = "true"; }
  updateAuthState(currentUser);
}

createPanels();
emailForm?.addEventListener("submit", login);
document.getElementById("registerForm")?.addEventListener("submit", register);
document.getElementById("resetForm")?.addEventListener("submit", reset);
document.getElementById("magicLinkForm")?.addEventListener("submit", magicLink);
document.getElementById("openRegisterButton")?.addEventListener("click", () => showPanel(document.getElementById("authRegisterPanel")));
document.getElementById("backToLoginFromRegister")?.addEventListener("click", () => showPanel(loginPanel));
document.getElementById("forgotPasswordButton")?.addEventListener("click", () => showPanel(document.getElementById("authResetPanel")));
document.getElementById("backToLoginFromReset")?.addEventListener("click", () => showPanel(loginPanel));
document.getElementById("openMagicLinkButton")?.addEventListener("click", () => showPanel(document.getElementById("authMagicPanel")));
document.getElementById("backToLoginFromMagic")?.addEventListener("click", () => showPanel(loginPanel));
document.getElementById("resendVerificationButton")?.addEventListener("click", resendVerification);
document.getElementById("refreshVerificationButton")?.addEventListener("click", refreshVerification);
document.getElementById("logoutVerificationButton")?.addEventListener("click", () => logOut());
window.duitjomAuthState = { user: null, isVerified: false };
window.logoutUser = () => logOut();
window.requireVerifiedUser = () => isVerified;
const originalPayment = window.goToPaymentPage;
if (typeof originalPayment === "function") window.goToPaymentPage = () => isVerified ? originalPayment() : message("Sila log masuk dan sahkan email sebelum membuat bayaran.", "error");
monitorAuthState(updateAuthState);
document.addEventListener("duitjom:component-loaded", (event) => { if (event.detail?.containerId === "sidebar-container") bindSidebar(); });
finishMagicLink();
