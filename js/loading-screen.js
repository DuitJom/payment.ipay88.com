/* =========================================================
   DUITJOM PAGE TRANSITION / LOADING OVERLAY
   Cosmetic-only overlay for in-app navigation. Never blocks
   or delays the real async work — runs in parallel and is
   dismissed immediately if the underlying action errors.
   ========================================================= */
(function () {
  "use strict";

  var DURATION_MS = 7500;
  var MESSAGE_KEYS = ["loading.message1", "loading.message2", "loading.message3", "loading.message4"];
  var MESSAGE_TIMES = [0, 2000, 4000, 6000];

  var overlay = null;
  var progressBar = null;
  var percentageLabel = null;
  var statusLabel = null;
  var rafId = null;
  var messageTimers = [];
  var startedAt = 0;
  var minimumHideResolve = null;

  function cacheRefs() {
    overlay = document.getElementById("loadingPage");
    progressBar = document.getElementById("loadingPageProgress");
    percentageLabel = document.getElementById("loadingPagePercentage");
    statusLabel = document.getElementById("loadingPageStatus");
  }

  function setMessage(index) {
    if (!statusLabel) return;
    var key = MESSAGE_KEYS[index] || MESSAGE_KEYS[0];
    statusLabel.style.opacity = "0";
    window.setTimeout(function () {
      statusLabel.textContent = window.DJ_I18N ? window.DJ_I18N.t(key) : key;
      statusLabel.style.opacity = "1";
    }, 120);
  }

  function tick() {
    var elapsed = Date.now() - startedAt;
    var pct = Math.min(100, Math.round((elapsed / DURATION_MS) * 100));
    if (progressBar) progressBar.style.width = pct + "%";
    if (percentageLabel) percentageLabel.textContent = pct + "%";
    if (elapsed < DURATION_MS) {
      rafId = window.requestAnimationFrame(tick);
    } else if (minimumHideResolve) {
      minimumHideResolve();
      minimumHideResolve = null;
    }
  }

  function clearMessageTimers() {
    messageTimers.forEach(function (id) { window.clearTimeout(id); });
    messageTimers = [];
  }

  function showOverlay() {
    if (!overlay) cacheRefs();
    if (!overlay) return Promise.resolve();

    overlay.classList.remove("hidden");
    overlay.classList.add("flex");
    document.body.style.overflow = "hidden";

    startedAt = Date.now();
    if (progressBar) progressBar.style.width = "0%";
    if (percentageLabel) percentageLabel.textContent = "0%";
    setMessage(0);

    clearMessageTimers();
    MESSAGE_TIMES.slice(1).forEach(function (time, i) {
      messageTimers.push(window.setTimeout(function () { setMessage(i + 1); }, time));
    });

    if (rafId) window.cancelAnimationFrame(rafId);
    return new Promise(function (resolve) {
      minimumHideResolve = resolve;
      rafId = window.requestAnimationFrame(tick);
    });
  }

  function hideOverlay() {
    if (!overlay) cacheRefs();
    if (rafId) window.cancelAnimationFrame(rafId);
    clearMessageTimers();
    minimumHideResolve = null;
    if (!overlay) return;
    overlay.classList.add("hidden");
    overlay.classList.remove("flex");
    document.body.style.overflow = "";
  }

  /**
   * Shows the DuitJom transition overlay for a minimum of ~7.5s (cosmetic)
   * while `action` runs concurrently in the background. If `action` rejects,
   * the overlay is dismissed immediately so the real error UI can take over.
   * @param {() => (void | Promise<void>)} action
   */
  window.showPageTransition = function showPageTransition(action) {
    var minimumWait = showOverlay();
    var actionResult;
    try {
      actionResult = action ? action() : undefined;
    } catch (error) {
      hideOverlay();
      throw error;
    }

    if (actionResult && typeof actionResult.then === "function") {
      actionResult.catch(function () {
        hideOverlay();
      });
      return Promise.all([minimumWait, actionResult]).then(
        function () { hideOverlay(); },
        function (error) { hideOverlay(); throw error; }
      );
    }

    return minimumWait.then(function () { hideOverlay(); });
  };

  window.hidePageTransition = hideOverlay;
})();
