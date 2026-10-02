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
let pendingChallengeId = null;
let emailSessionVerified = false;
let emailSessionExpiresAt = 0;
let restoringSession = null;
let continuing = false;
const workerRequests = new Set();
let otpBusy = false;
let googleBusy = false;
let actionVersion = 0;
const resendCooldowns = new Map();
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
  else if (error?.messageKey) showMessage(error.messageKey, "error", error.vars || {});
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
    if (value?.verified !== true || !["otp", "google"].includes(value.provider) || !EMAIL_PATTERN.test(value?.email || "") ||
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
  if (activeIdentity.provider === "otp" && (!emailSessionVerified || Date.now() >= emailSessionExpiresAt)) return false;
  const age = Date.now() - activeIdentity.loginAt;
  return activeIdentity.verified === true && age >= 0 && age <= SESSION_MAX_AGE_MS;
}
window.canContinueToPayment = canContinue;

function renderAccount() {
  const signedIn = canContinue();
  visible(loginPanel, !signedIn);
  visible(userPanel, signedIn);
  visible(paymentActionPanel, signedIn);
  if (continueButton) continueButton.disabled = !signedIn || continuing;
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
  emailSessionVerified = false;
  emailSessionExpiresAt = 0;
  activeIdentity = null;
  clearStoredSession();
  renderAccount();
  openEmailForm();
  showMessage("auth.needLoginToPay", "error");
  loginPanel?.scrollIntoView({ block: "center", behavior: "smooth" });
};
continueButton?.addEventListener("click", async event => {
  event.preventDefault();
  if (continuing) return;
  if (!canContinue()) { event.preventDefault(); window.requestPaymentLogin(); return; }
  const version = actionVersion;
  continuing = true;
  renderAccount();
  try {
    if (activeIdentity.provider === "otp") {
      const email = activeIdentity.email;
      const session = await callWorker("/api/session", undefined, "GET");
      if (version !== actionVersion) return;
      acceptEmailSession(session, email);
    }
    if (typeof window.goToPaymentPage === "function") window.goToPaymentPage();
  } catch (error) {
    if (version === actionVersion) {
      emailSessionVerified = false;
      renderAccount();
      openEmailForm();
      showError(error);
    }
  } finally {
    if (version === actionVersion) { continuing = false; renderAccount(); }
  }
});

function cooldownDeadline() {
  return resendCooldowns.get(emailInput?.value.trim().toLowerCase()) || 0;
}
function updateControls() {
  const busy = otpBusy || googleBusy;
  const coolingDown = Date.now() < cooldownDeadline();
  if (requestButton) requestButton.disabled = busy || coolingDown || !window.loginTurnstileToken;
  if (verifyButton) verifyButton.disabled = busy || !pendingEmail;
  if (resendButton) {
    resendButton.disabled = busy || coolingDown;
    resendButton.setAttribute("aria-disabled", String(resendButton.disabled));
  }
  if (googleButton) googleButton.disabled = busy;
  if (logoutButton) logoutButton.disabled = googleBusy;
  if (continueButton) continueButton.disabled = !canContinue() || continuing;
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
  for (const [email, deadline] of resendCooldowns) {
    if (deadline <= Date.now()) resendCooldowns.delete(email);
  }
  const seconds = Math.max(0, Math.ceil((cooldownDeadline() - Date.now()) / 1000));
  if (resendButton) {
    resendButton.textContent = t(seconds ? "auth.resendOtpCountdown" : "auth.resendOtp", { seconds });
  }
  updateControls();
  if (!resendCooldowns.size && resendTimer) { clearInterval(resendTimer); resendTimer = null; }
}
function startCountdown(email, seconds = 60) {
  resendCooldowns.set(email, Date.now() + seconds * 1000);
  if (resendTimer) clearInterval(resendTimer);
  tickCountdown();
  resendTimer = setInterval(tickCountdown, 250);
}
function clearDigits() { otpInputs.forEach(input => { input.value = ""; }); }
emailInput?.addEventListener("input", () => {
  if (pendingEmail && emailInput.value.trim().toLowerCase() !== pendingEmail) {
    pendingEmail = null;
    pendingChallengeId = null;
    clearDigits();
    clearMessage();
  }
  tickCountdown();
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

async function callWorker(endpoint, body, method = "POST") {
  const controller = new AbortController();
  workerRequests.add(controller);
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(`${WORKER_URL}${endpoint}`, {
      method, credentials: "include", headers: method === "GET" ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal
    });
    let data;
    try { data = await response.json(); }
    catch { throw { messageKey: response.status === 403 ? "auth.apiBlocked" : "auth.serviceError" }; }
    if (!response.ok || data?.success !== true) {
      console.warn("Email auth request failed", { status: response.status, code: data?.code, requestId: data?.requestId });
      const messageKeys = {
        INVALID_EMAIL: "auth.errors.auth/invalid-email", TURNSTILE_REQUIRED: "auth.securityRequired",
        TURNSTILE_REJECTED: "auth.securityError", TURNSTILE_CONFIG: "auth.securityError",
        MAILJET_REJECTED: "auth.mailDeliveryFailed", OTP_INVALID: "auth.otpInvalid",
        SESSION_REQUIRED: "auth.sessionExpired", ORIGIN_REJECTED: "auth.apiBlocked",
        RATE_LIMITED: "auth.rateLimited", RESEND_COOLDOWN: "auth.rateLimited"
      };
      const seconds = Math.min(3600, Math.max(0, Number(data?.retryAfter) || 0));
      throw { messageKey: messageKeys[data?.code] || "auth.serviceError", retryAfter: seconds, vars: { seconds } };
    }
    return data;
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("TIMEOUT");
    throw error;
  } finally { clearTimeout(timeout); workerRequests.delete(controller); }
}
function acceptEmailSession(data, expectedEmail) {
  const email = data?.user?.email;
  const expiresAt = Number(data?.expiresAt);
  if (!EMAIL_PATTERN.test(email || "") || (expectedEmail && email !== expectedEmail) ||
      !Number.isFinite(expiresAt) || expiresAt <= Date.now()) throw { messageKey: "auth.sessionExpired" };
  emailSessionVerified = true;
  emailSessionExpiresAt = expiresAt;
  rememberIdentity(email, "otp");
}
function restoreEmailSession() {
  if (activeIdentity?.provider === "google" || otpBusy || googleBusy) return Promise.resolve();
  if (restoringSession) return restoringSession;
  const version = actionVersion;
  emailSessionVerified = false;
  renderAccount();
  restoringSession = (async () => {
    try {
      const session = await callWorker("/api/session", undefined, "GET");
      if (version !== actionVersion || activeIdentity?.provider === "google") return;
      acceptEmailSession(session);
    } catch {
      if (version !== actionVersion || activeIdentity?.provider === "google") return;
      activeIdentity = null;
      clearStoredSession();
    } finally {
      if (version === actionVersion) renderAccount();
      restoringSession = null;
    }
  })();
  return restoringSession;
}
async function requestOtp() {
  if (otpBusy || googleBusy || Date.now() < cooldownDeadline()) return;
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
    const result = await callWorker("/api/send-otp", { email, turnstileToken: window.loginTurnstileToken });
    if (version !== actionVersion) return;
    if (typeof result.challengeId !== "string" || !/^[a-f0-9-]{36}$/.test(result.challengeId)) {
      throw { messageKey: "auth.serviceError" };
    }
    pendingEmail = email;
    pendingChallengeId = result.challengeId;
    clearDigits();
    startCountdown(email);
    showMessage("auth.otpSent", "success");
    otpInputs[0]?.focus();
  } catch (error) {
    if (version === actionVersion) {
      if (error.retryAfter) startCountdown(email, error.retryAfter);
      showError(error);
    }
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
    await callWorker("/api/verify-otp", { email, otp, challengeId: pendingChallengeId });
    if (version !== actionVersion) return;
    // Confirm the browser accepted the HttpOnly cookie before opening Continue.
    const session = await callWorker("/api/session", undefined, "GET");
    if (version !== actionVersion) return;
    acceptEmailSession(session, email);
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
  for (const controller of workerRequests) controller.abort();
  const challengeId = pendingChallengeId;
  pendingChallengeId = null;
  emailSessionVerified = false;
  emailSessionExpiresAt = 0;
  continuing = false;
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
  try {
    const results = await Promise.allSettled([
      callWorker("/api/logout", { challengeId }),
      firebase ? firebase.signOut(firebase.auth) : Promise.resolve()
    ]);
    if (results.some(result => result.status === "rejected")) showMessage("auth.logoutError", "error");
  }
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
  .catch(error => {
    firebaseError = error;
    console.error("Google sign-in initialization failed", error);
  }) : Promise.resolve();
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
}
document.addEventListener("duitjom:locale-changed", refreshLocale);
window.addEventListener("pageshow", () => { void restoreEmailSession(); tickCountdown(); });
refreshLocale();
const params = new URLSearchParams(window.location.search);
if (params.get("intent") === "register") {
  const title = byId("authTitle");
  if (title) {
    title.setAttribute("data-i18n", "auth.registerTitle");
    title.textContent = t("auth.registerTitle");
  }
}
if (params.get("auth") === "email") openEmailForm();
void Promise.all([restoreEmailSession(), firebaseReady]).then(() => {
  if (params.get("step") === "payment" && typeof window.goToPaymentPage === "function") {
    if (canContinue()) window.goToPaymentPage();
    else { openEmailForm(); showMessage("auth.needLoginToPay", "error"); }
  }
});
