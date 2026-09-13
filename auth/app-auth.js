import {
  loginWithGoogle, loginWithGithub, loginWithEmail, registerWithEmail, sendVerificationEmail, refreshCurrentUser,
  resetPassword, sendMagicLink, isMagicLink, completeMagicLink,
  ensureUserProfile, logOut, monitorAuthState, getFriendlyAuthError
} from "../auth.js?v=20260914";

const container = document.getElementById("firebaseAuthContainer");
const loginPanel = document.getElementById("authLoginPanel");
const userPanel = document.getElementById("authUserPanel");
const messageEl = document.getElementById("authMessage");
const emailForm = document.getElementById("emailLoginForm");
const emailButton = document.getElementById("emailLoginButton");
const googleButton = document.getElementById("googleLoginButton");
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
const t = (key, vars) => (window.DJ_I18N ? window.DJ_I18N.t(key, vars) : key);

function createPanels() {
  if (!container || document.getElementById("authRegisterPanel")) return;
  container.insertAdjacentHTML("beforeend", `<div id="authRegisterPanel" class="login-card hidden">
    <p class="login-kicker" data-i18n="auth.kickerRegister">NEW ACCOUNT</p><h2 class="login-title" data-i18n="auth.registerTitle">Create Account</h2>
    <form id="registerForm" class="login-panel">
      <label for="registerNameInput" data-i18n="auth.name">Name</label><input id="registerNameInput" type="text" autocomplete="name" required>
      <label for="registerEmailInput" class="mt-3" data-i18n="auth.email">Email</label><input id="registerEmailInput" type="email" autocomplete="email" required>
      <label for="registerPasswordInput" class="mt-3" data-i18n="auth.password">Password</label><input id="registerPasswordInput" type="password" minlength="6" autocomplete="new-password" required>
      <label for="registerConfirmInput" class="mt-3" data-i18n="auth.confirmPassword">Confirm Password</label><input id="registerConfirmInput" type="password" minlength="6" autocomplete="new-password" required>
      <button id="registerButton" type="submit" class="login-primary-button mt-4" data-i18n="auth.registerButton">Register</button>
    </form><button id="backToLoginFromRegister" type="button" class="login-secondary-button mt-3 w-full" data-i18n="auth.backToLogin">Back to Sign In</button>
  </div>
  <div id="authResetPanel" class="login-card hidden"><p class="login-kicker" data-i18n="auth.kickerReset">ACCOUNT RECOVERY</p><h2 class="login-title" data-i18n="auth.resetTitle">Forgot Your Password?</h2>
    <form id="resetForm" class="login-panel"><label for="resetEmailInput" data-i18n="auth.email">Email</label><input id="resetEmailInput" type="email" autocomplete="email" required>
      <button id="resetButton" type="submit" class="login-primary-button mt-4" data-i18n="auth.resetButton">Send Reset Email</button>
    </form><button id="backToLoginFromReset" type="button" class="login-secondary-button mt-3 w-full" data-i18n="auth.backToLogin">Back to Sign In</button>
  </div>
  <div id="authMagicPanel" class="login-card hidden"><p class="login-kicker" data-i18n="auth.kickerMagic">MAGIC LINK</p><h2 class="login-title" data-i18n="auth.magicTitle">Sign In Without a Password</h2>
    <form id="magicLinkForm" class="login-panel"><label for="magicLinkEmailInput" data-i18n="auth.email">Email</label><input id="magicLinkEmailInput" type="email" autocomplete="email" required>
      <button id="magicLinkButton" type="submit" class="login-primary-button mt-4" data-i18n="auth.magicButton">Send Link</button>
    </form><button id="backToLoginFromMagic" type="button" class="login-secondary-button mt-3 w-full" data-i18n="auth.backToLogin">Back to Sign In</button>
  </div>
  <div id="authVerificationPanel" class="login-card hidden"><p class="login-kicker" data-i18n="auth.kickerVerify">EMAIL VERIFICATION</p><h2 class="login-title" data-i18n="auth.verifyTitle">Verify Your Email</h2>
    <p class="login-subtitle" data-i18n="auth.verifySubtitle">Please check your inbox and click the verification link before continuing.</p>
    <button id="resendVerificationButton" type="button" class="login-primary-button mt-4" data-i18n="auth.resendVerification">Resend Email</button>
    <button id="refreshVerificationButton" type="button" class="login-secondary-button mt-2 w-full" data-i18n="auth.refreshVerification">I've Verified My Email</button>
    <button id="logoutVerificationButton" type="button" class="login-secondary-button mt-2 w-full" data-i18n="auth.logoutButton">Log Out</button>
  </div>`);
  emailForm?.insertAdjacentHTML("afterend", `<div class="mt-3 grid grid-cols-2 gap-2"><button id="forgotPasswordButton" type="button" class="login-secondary-button" data-i18n="auth.forgotPassword">Forgot Password?</button><button id="openRegisterButton" type="button" class="login-secondary-button" data-i18n="auth.registerAccount">Create Account</button></div><button id="openMagicLinkButton" type="button" class="login-secondary-button mt-2 w-full" data-i18n="auth.magicLinkOpen">Sign In Without Password</button>`);
  window.DJ_I18N?.applyTranslations(container);
}

function showPanel(panel) {
  [loginPanel, userPanel, "authRegisterPanel", "authResetPanel", "authMagicPanel", "authVerificationPanel"].forEach((item) => {
    const node = typeof item === "string" ? document.getElementById(item) : item;
    node?.classList.toggle("hidden", node !== panel);
  });
}

function isTrustedProvider(user) {
  return Boolean(user?.emailVerified || user?.providerData?.some(({ providerId }) => providerId === "google.com" || providerId === "github.com"));
}

function updateAuthState(user) {
  currentUser = user || null;
  isVerified = isTrustedProvider(user);
  window.duitjomAuthState = { user: currentUser, isVerified };
  const name = user?.displayName || user?.email || "";
  showPanel(!user ? loginPanel : isVerified ? userPanel : document.getElementById("authVerificationPanel"));
  document.getElementById("btnPembayaranPinjaman")?.classList.toggle("hidden", !isVerified);
  document.getElementById("sidebarGoogleSection")?.classList.toggle("hidden", isVerified);
  document.getElementById("sidebarAccountSection")?.classList.toggle("hidden", !isVerified);
  document.querySelectorAll("[data-auth-user-name]").forEach((el) => { el.textContent = name; });
  document.getElementById("authUserLabel")?.replaceChildren(document.createTextNode(name));
  document.getElementById("userDisplay")?.replaceChildren(document.createTextNode(name));
  if (user && !isVerified) message(t("auth.needVerification"));
  else if (!user) message("");
  if (isVerified) ensureUserProfile(user).catch((error) => console.warn("Firestore profile not saved:", error));
}

async function googleLogin(event) {
  event?.preventDefault();
  const button = googleButton;
  if (button) { button.disabled = true; button.dataset.originalText = button.textContent; button.textContent = t("auth.googleConnecting"); }
  try { await window.showPageTransition(() => loginWithGoogle()); }
  catch (error) { console.error("Google login failed:", error); message(friendly(error), "error"); }
  finally { if (button) { button.disabled = false; button.textContent = button.dataset.originalText || t("auth.googleContinue"); } }
}

async function githubLogin(event) {
  event?.preventDefault();
  const button = document.getElementById("githubLoginButton");
  if (button) { button.disabled = true; button.dataset.originalText = button.textContent; button.textContent = t("auth.githubConnecting"); }
  try { await window.showPageTransition(() => loginWithGithub()); }
  catch (error) { console.error("GitHub login failed:", error); message(friendly(error), "error"); }
  finally { if (button) { button.disabled = false; button.textContent = button.dataset.originalText || t("auth.githubContinue"); } }
}

async function login(event) {
  event.preventDefault(); emailButton.disabled = true;
  try { await loginWithEmail(document.getElementById("emailInput").value.trim(), document.getElementById("passwordInput").value); }
  catch (error) { message(friendly(error), "error"); }
  finally { emailButton.disabled = false; }
}
function getVerificationActionSettings() {
  const returnUrl = new URL(window.location.href);
  returnUrl.search = "";
  returnUrl.hash = "";
  return { url: returnUrl.toString(), handleCodeInApp: false };
}

async function register(event) {
  event.preventDefault();
  const password = document.getElementById("registerPasswordInput").value;
  if (password !== document.getElementById("registerConfirmInput").value) return message(t("auth.passwordMismatch"), "error");
  const button = document.getElementById("registerButton"); button.disabled = true;
  try {
    const result = await registerWithEmail(document.getElementById("registerNameInput").value.trim(), document.getElementById("registerEmailInput").value.trim().toLowerCase(), password);
    await sendVerificationEmail(result.user, getVerificationActionSettings()); updateAuthState(result.user); message(t("auth.registerSuccess"));
  } catch (error) { message(friendly(error), "error"); } finally { button.disabled = false; }
}
async function reset(event) {
  event.preventDefault(); const button = document.getElementById("resetButton"); button.disabled = true;
  try { await resetPassword(document.getElementById("resetEmailInput").value.trim().toLowerCase()); showPanel(loginPanel); message(t("auth.resetSuccess")); }
  catch (error) { message(friendly(error), "error"); } finally { button.disabled = false; }
}
async function magicLink(event) {
  event.preventDefault(); const button = document.getElementById("magicLinkButton"); button.disabled = true;
  const email = document.getElementById("magicLinkEmailInput").value.trim().toLowerCase();
  try { await sendMagicLink(email, { url: window.DUITJOM_AUTH_REDIRECT_URL || window.location.href, handleCodeInApp: true }); window.localStorage.setItem("emailForSignIn", email); message(t("auth.magicLinkSent")); }
  catch (error) { message(friendly(error), "error"); } finally { button.disabled = false; }
}
async function finishMagicLink() {
  if (!isMagicLink(window.location.href)) return;
  const email = window.localStorage.getItem("emailForSignIn") || window.prompt(t("auth.magicLinkEmailRequired"));
  if (!email) return message(t("auth.magicLinkEmailRequired"), "error");
  try {
    await window.showPageTransition(() => completeMagicLink(email.trim().toLowerCase(), window.location.href));
    window.localStorage.removeItem("emailForSignIn");
    window.history.replaceState({}, document.title, window.location.pathname);
  } catch (error) { message(friendly(error), "error"); }
}
async function refreshVerification(event) {
  event?.preventDefault();
  const button = document.getElementById("refreshVerificationButton");
  if (button) { button.disabled = true; button.dataset.originalText = button.textContent; button.textContent = t("auth.checkingStatus"); }
  message(t("auth.checkingStatus"));
  try {
    const user = await refreshCurrentUser();
    updateAuthState(user);
    const verified = isTrustedProvider(user);
    message(verified ? t("auth.verifiedSuccess") : t("auth.verifiedPending"), verified ? "info" : "error");
  } catch (error) {
    console.error("Verification check failed:", error);
    message(friendly(error), "error");
  } finally {
    if (button) { button.disabled = false; button.textContent = button.dataset.originalText || t("auth.refreshVerification"); }
  }
}
async function syncVerificationStatus() {
  if (!currentUser || isTrustedProvider(currentUser)) return;
  try {
    const user = await refreshCurrentUser(currentUser);
    updateAuthState(user);
  } catch (error) {
    console.warn("Auto refresh verification failed:", error);
  }
}

async function resendVerification() {
  try { await sendVerificationEmail(currentUser, getVerificationActionSettings()); message(t("auth.verificationResent")); }
  catch (error) { message(friendly(error), "error"); }
}
async function logout() {
  try {
    await logOut();
    window.showPageTransition(() => {
      document.getElementById("paymentPage")?.classList.add("hidden");
      document.getElementById("qrPage")?.classList.add("hidden");
      document.getElementById("thanksPage")?.classList.add("hidden");
      document.getElementById("mainPage")?.classList.remove("hidden");
      document.getElementById("firebaseAuthContainer")?.classList.remove("hidden");
      document.getElementById("siteFooter")?.classList.remove("hidden");
      window.closeSidebar?.();
    });
  } catch (error) { message(friendly(error), "error"); }
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
document.getElementById("googleLoginButton")?.insertAdjacentHTML("afterend", "<button id=\"githubLoginButton\" type=\"button\" class=\"login-provider-button github-provider-button\"><svg class=\"github-provider-icon\" width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M12 .7a11.3 11.3 0 0 0-3.57 22.02c.57.1.78-.25.78-.55v-2.16c-3.18.69-3.85-1.53-3.85-1.53-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.67 1.24 3.32.95.1-.74.4-1.24.72-1.53-2.54-.29-5.21-1.27-5.21-5.66 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.45.11-3.03 0 0 .96-.31 3.12 1.17a10.8 10.8 0 0 1 5.68 0c2.16-1.48 3.12-1.17 3.12-1.17.62 1.58.23 2.74.11 3.03.73.8 1.18 1.82 1.18 3.07 0 4.4-2.68 5.36-5.23 5.65.41.36.77 1.07.77 2.16v3.2c0 .3.2.66.79.55A11.3 11.3 0 0 0 12 .7Z\"/></svg> <span data-i18n=\"auth.githubContinue\">Continue with GitHub</span></button>");
document.getElementById("githubLoginButton")?.addEventListener("click", githubLogin);
googleButton?.addEventListener("click", googleLogin);
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
document.getElementById("logoutVerificationButton")?.addEventListener("click", logout);
window.duitjomAuthState = { user: null, isVerified: false };
window.signInWithGoogle = googleLogin;
window.logoutUser = logout;
window.requireVerifiedUser = () => isVerified;
const originalPayment = window.goToPaymentPage;
if (typeof originalPayment === "function") window.goToPaymentPage = () => isVerified ? originalPayment() : message(t("auth.needLoginToPay"), "error");
monitorAuthState(updateAuthState);
document.addEventListener("duitjom:component-loaded", (event) => { if (event.detail?.containerId === "sidebar-container") bindSidebar(); });
finishMagicLink().finally(() => {
  window.setTimeout(syncVerificationStatus, 700);
});
window.addEventListener("focus", syncVerificationStatus);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) syncVerificationStatus();
});
