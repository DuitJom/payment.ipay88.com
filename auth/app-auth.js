// Email sign-up/sign-in uses the existing OTP Worker. Firebase is Google-only here.
const byId = id => document.getElementById(id);
const googleButton = byId("googleLoginButton");
const emailToggle = byId("emailToggleButton");
const emailForm = byId("emailLoginForm");
const emailInput = byId("emailInput");
const otpInputs = Array.from(document.querySelectorAll("[data-login-otp]"));
const requestButton = byId("emailLoginButton");
const verifyButton = byId("verifyOtpButton");
const resendButton = byId("resendOtpButton");
const continueButton = byId("authContinueButton");
const logoutButton = byId("logoutButton");
const loginPanel = byId("authLoginPanel");
const userPanel = byId("authUserPanel");
const userDisplay = byId("userDisplay");
const messageBox = byId("authMessage");
const paymentActionPanel = byId("btnPembayaranPinjaman");

const WORKER_URL = "https://e-kyc.duitjom.my";
const SESSION_KEY = "duitjom_session";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
let firebase = null;
let firebaseError = null;
let hadFirebaseUser = false;
let pendingEmail = null;
let otpBusy = false;
let googleBusy = false;
let actionVersion = 0;
let resendUntil = 0;
let resendTimer = null;
let lastMessage = null;
let activeIdentity = readSession();

function t(key, vars) {
  return window.DJ_I18N?.t(key, vars) || key;
}
function showMessage(key, type = "info", vars = {}, literal = false) {
  lastMessage = { key, type, vars, literal };
  if (!messageBox) return;
  messageBox.textContent = literal ? key : t(key, vars);
  messageBox.classList.remove("info", "success", "error", "warning");
  messageBox.classList.add(type);
  messageBox.hidden = false;
}
function clearMessage() {
  lastMessage = null;
  if (messageBox) { messageBox.textContent = ""; messageBox.hidden = true; }
}
function showError(error) {
  const keys = {
    "auth/popup-blocked": "auth.errors.auth/popup-blocked",
    "auth/popup-closed-by-user": "auth.errors.auth/popup-closed-by-user",
    "auth/unauthorized-domain": "auth.googleDomainError",
    "auth/network-request-failed": "auth.errors.auth/network-request-failed"
  };
  if (error?.message === "TIMEOUT") showMessage("auth.timeoutError", "error");
  else if (error?.messageKey) showMessage(error.messageKey, "error");
  else if (keys[error?.code]) showMessage(keys[error.code], "error");
  else if (error?.serverMessage) showMessage(error.serverMessage, "error", {}, true);
  else showMessage("auth.genericError", "error");
}
function visible(element, show) {
  if (!element) return;
  element.hidden = !show;
  element.classList.toggle("hidden", !show);
}
function clearStoredSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch { /* Storage may be disabled. */ }
}
function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw);
    const age = Date.now() - value?.loginAt;
    if (value?.verified !== true || !EMAIL_PATTERN.test(value?.email || "") ||
        !Number.isFinite(value?.loginAt) || age < 0 || age > SESSION_MAX_AGE_MS) {
      clearStoredSession();
      return null;
    }
    return value;
  } catch { clearStoredSession(); return null; }
}
function rememberIdentity(email, provider) {
  activeIdentity = { email, provider, verified: true, loginAt: Date.now() };
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(activeIdentity)); }
  catch { /* The verified identity still works for this page visit. */ }
}
function canContinue() {
  if (!activeIdentity) return false;
  if (activeIdentity.provider === "google" && !hadFirebaseUser) return false;
  const age = Date.now() - activeIdentity.loginAt;
  return activeIdentity.verified === true && age >= 0 && age <= SESSION_MAX_AGE_MS;
}
window.canContinueToPayment = canContinue;

function renderAccount() {
  const signedIn = canContinue();
  visible(loginPanel, !signedIn);
  visible(userPanel, signedIn);
  visible(paymentActionPanel, signedIn);
  if (continueButton) continueButton.disabled = !signedIn;
  if (userDisplay) {
    userDisplay.textContent = signedIn
      ? t("auth.welcomeBack", { name: activeIdentity.email.split("@")[0] }) : "";
  }
}
function openEmailForm(focus = true) {
  visible(emailForm, true);
  emailToggle?.setAttribute("aria-expanded", "true");
  if (focus) emailInput?.focus();
}
emailToggle?.addEventListener("click", () => {
  const show = emailForm?.hidden;
  visible(emailForm, show);
  emailToggle.setAttribute("aria-expanded", String(show));
  if (show) emailInput?.focus();
});
window.requestPaymentLogin = () => {
  activeIdentity = null;
  clearStoredSession();
  renderAccount();
  openEmailForm();
  showMessage("auth.needLoginToPay", "error");
  loginPanel?.scrollIntoView({ block: "center", behavior: "smooth" });
};
continueButton?.addEventListener("click", event => {
  if (!canContinue()) { event.preventDefault(); window.requestPaymentLogin(); return; }
  if (typeof window.goToPaymentPage === "function") {
    event.preventDefault();
    window.goToPaymentPage();
  }
});

function updateControls() {
  const busy = otpBusy || googleBusy;
  const coolingDown = Date.now() < resendUntil;
  if (requestButton) requestButton.disabled = busy || coolingDown || !window.loginTurnstileToken;
  if (verifyButton) verifyButton.disabled = busy || !pendingEmail;
  if (resendButton) {
    resendButton.disabled = busy || coolingDown;
    resendButton.setAttribute("aria-disabled", String(resendButton.disabled));
  }
  if (googleButton) googleButton.disabled = busy;
  if (logoutButton) logoutButton.disabled = googleBusy;
  if (emailInput) emailInput.readOnly = busy;
  otpInputs.forEach(input => { input.readOnly = busy; });
  emailForm?.setAttribute("aria-busy", String(busy));
}
window.updateLoginOtpControls = updateControls;
window.showLoginSecurityError = () => showMessage("auth.securityError", "error");
function resetTurnstile() {
  window.loginTurnstileToken = null;
  try { window.turnstile?.reset("#loginTurnstileWidget"); } catch { /* API may not have loaded. */ }
  updateControls();
}
function tickCountdown() {
  const seconds = Math.max(0, Math.ceil((resendUntil - Date.now()) / 1000));
  if (resendButton) {
    resendButton.textContent = t(seconds ? "auth.resendOtpCountdown" : "auth.resendOtp", { seconds });
  }
  updateControls();
  if (!seconds && resendTimer) { clearInterval(resendTimer); resendTimer = null; }
}
function startCountdown() {
  resendUntil = Date.now() + 60_000;
  if (resendTimer) clearInterval(resendTimer);
  tickCountdown();
  resendTimer = setInterval(tickCountdown, 250);
}
function clearDigits() { otpInputs.forEach(input => { input.value = ""; }); }
emailInput?.addEventListener("input", () => {
  if (pendingEmail && emailInput.value.trim().toLowerCase() !== pendingEmail) {
    pendingEmail = null;
    clearDigits();
    clearMessage();
    updateControls();
  }
});
function fillDigits(value, start = 0) {
  const digits = value.replace(/[^0-9]/g, "").slice(0, 6 - start);
  for (let i = start; i < 6; i++) otpInputs[i].value = digits[i - start] || "";
  otpInputs[Math.min(start + digits.length, 5)]?.focus();
}
otpInputs.forEach((input, index) => {
  input.addEventListener("input", () => {
    const digits = input.value.replace(/[^0-9]/g, "");
    if (digits.length > 1) fillDigits(digits, index);
    else { input.value = digits; if (digits) otpInputs[index + 1]?.focus(); }
  });
  input.addEventListener("paste", event => {
    if (otpBusy || googleBusy) return;
    const value = event.clipboardData?.getData("text") || "";
    if (!/[0-9]/.test(value)) return;
    event.preventDefault();
    fillDigits(value, index);
  });
  input.addEventListener("keydown", event => {
    if (otpBusy || googleBusy) return;
    if (event.key === "Backspace" && !input.value && index > 0) {
      event.preventDefault();
      otpInputs[index - 1].value = "";
      otpInputs[index - 1].focus();
    }
    if (event.key === "ArrowLeft") otpInputs[index - 1]?.focus();
    if (event.key === "ArrowRight") otpInputs[index + 1]?.focus();
    if (event.key === "Enter") { event.preventDefault(); void verifyOtp(); }
  });
});

async function callWorker(endpoint, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`${WORKER_URL}${endpoint}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body), signal: controller.signal
    });
    let data;
    try { data = await response.json(); }
    catch { throw { messageKey: "auth.serviceError" }; }
    if (!response.ok || data?.success !== true) {
      throw data?.message ? { serverMessage: data.message } : { messageKey: "auth.serviceError" };
    }
    return data;
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("TIMEOUT");
    throw error;
  } finally { clearTimeout(timeout); }
}
async function requestOtp() {
  if (otpBusy || googleBusy || Date.now() < resendUntil) return;
  clearMessage();
  const email = emailInput?.value.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email || "")) {
    showMessage("auth.errors.auth/invalid-email", "error");
    emailInput?.focus();
    return;
  }
  if (!window.loginTurnstileToken) { showMessage("auth.securityRequired", "error"); return; }
  const version = ++actionVersion;
  otpBusy = true;
  updateControls();
  try {
    await callWorker("/api/send-otp", { email, turnstileToken: window.loginTurnstileToken });
    if (version !== actionVersion) return;
    pendingEmail = email;
    clearDigits();
    startCountdown();
    showMessage("auth.otpSent", "success");
    otpInputs[0]?.focus();
  } catch (error) {
    if (version === actionVersion) showError(error);
  } finally {
    if (version === actionVersion) { otpBusy = false; resetTurnstile(); }
  }
}
emailForm?.addEventListener("submit", event => { event.preventDefault(); void requestOtp(); });
resendButton?.addEventListener("click", requestOtp);
async function verifyOtp() {
  if (otpBusy || googleBusy) return;
  clearMessage();
  const email = emailInput?.value.trim().toLowerCase();
  const otp = otpInputs.map(input => input.value).join("");
  if (!pendingEmail || pendingEmail !== email) { showMessage("auth.requestOtpFirst", "error"); return; }
  if (!/^[0-9]{6}$/.test(otp)) {
    showMessage("auth.otpIncomplete", "error");
    otpInputs.find(input => !input.value)?.focus();
    return;
  }
  const version = ++actionVersion;
  otpBusy = true;
  updateControls();
  try {
    await callWorker("/api/verify-otp", { email, otp });
    if (version !== actionVersion) return;
    rememberIdentity(email, "otp");
    pendingEmail = null;
    clearDigits();
    renderAccount();
    showMessage("auth.otpVerified", "success");
    continueButton?.focus();
  } catch (error) {
    if (version === actionVersion) showError(error);
  } finally {
    if (version === actionVersion) { otpBusy = false; updateControls(); }
  }
}
verifyButton?.addEventListener("click", verifyOtp);

async function logout() {
  actionVersion++;
  activeIdentity = null;
  clearStoredSession();
  pendingEmail = null;
  otpBusy = false;
  clearDigits();
  clearMessage();
  renderAccount();
  resetTurnstile();
  ["paymentPage", "qrPage", "thanksPage"].forEach(id => byId(id)?.classList.add("hidden"));
  ["mainPage", "firebaseAuthContainer", "siteFooter", "features-container"].forEach(id => byId(id)?.classList.remove("hidden"));
  googleBusy = true;
  updateControls();
  try { if (firebase) await firebase.signOut(firebase.auth); }
  catch { showMessage("auth.logoutError", "error"); }
  finally { googleBusy = false; updateControls(); }
}
logoutButton?.addEventListener("click", logout);
window.logoutUser = logout;
function handleFirebaseState(user) {
  const isGoogle = user?.providerData?.some(provider => provider.providerId === "google.com");
  if (isGoogle && user.emailVerified === true && EMAIL_PATTERN.test(user.email || "")) {
    hadFirebaseUser = true;
    rememberIdentity(user.email, "google");
  } else if (activeIdentity?.provider === "google") {
    hadFirebaseUser = false;
    activeIdentity = null;
    clearStoredSession();
  }
  // An unverified Firebase email/password account must not hide the OTP login form.
  renderAccount();
}
const firebaseReady = googleButton ? import("../firebase-config.js")
  .then(async module => {
    firebase = module;
    await module.authPersistenceReady;
    module.onAuthStateChanged(module.auth, handleFirebaseState);
    void import("https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js")
      .then(module => module.getRedirectResult(firebase.auth))
      .then(result => { if (result?.user) handleFirebaseState(result.user); })
      .catch(showError);
  })
  .catch(error => { firebaseError = error; }) : Promise.resolve();
googleButton?.addEventListener("click", async () => {
  if (otpBusy || googleBusy) return;
  clearMessage();
  const version = ++actionVersion;
  googleBusy = true;
  updateControls();
  try {
    await firebaseReady;
    if (!firebase || firebaseError) throw { messageKey: "auth.googleUnavailable" };
    const result = await firebase.signInWithPopup(firebase.auth, firebase.googleProvider);
    if (version !== actionVersion) return;
    handleFirebaseState(result.user);
    if (!canContinue()) throw { messageKey: "auth.needVerification" };
    continueButton?.focus();
  } catch (error) { if (version === actionVersion) showError(error); }
  finally { if (version === actionVersion) { googleBusy = false; updateControls(); } }
});

function refreshLocale() {
  otpInputs.forEach((input, index) => input.setAttribute("aria-label", t("auth.otpDigit", { digit: index + 1 })));
  tickCountdown();
  renderAccount();
  if (lastMessage) showMessage(lastMessage.key, lastMessage.type, lastMessage.vars, lastMessage.literal);
  document.querySelectorAll("[data-auth-locale]").forEach(select => { select.value = window.DJ_I18N?.getLocale() || "en"; });
}
document.querySelectorAll("[data-auth-locale]").forEach(select => {
  select.addEventListener("change", () => window.DJ_I18N?.setLocale(select.value));
});
document.addEventListener("duitjom:locale-changed", refreshLocale);
window.addEventListener("pageshow", () => { renderAccount(); tickCountdown(); });
refreshLocale();
const params = new URLSearchParams(window.location.search);
if (params.get("auth") === "email") openEmailForm();
if (params.get("step") === "payment" && typeof window.goToPaymentPage === "function") {
  if (canContinue()) window.goToPaymentPage();
  else { openEmailForm(); showMessage("auth.needLoginToPay", "error"); }
}
