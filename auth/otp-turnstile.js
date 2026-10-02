// Register callbacks before the asynchronous Turnstile API loads on the portal.
window.loginTurnstileToken = null;
window.onLoginTurnstileSuccess = function (token) {
  window.loginTurnstileToken = token;
  window.updateLoginOtpControls?.();
};
window.onLoginTurnstileError = function () {
  window.loginTurnstileToken = null;
  window.updateLoginOtpControls?.();
  window.showLoginSecurityError?.();
};
window.onLoginTurnstileExpired = function () {
  window.loginTurnstileToken = null;
  window.updateLoginOtpControls?.();
};
