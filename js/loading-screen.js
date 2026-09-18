/* =========================================================
   DUITJOM PAGE TRANSITION / LOADING OVERLAY
   Cosmetic-only overlay for in-app navigation. Never blocks
   or delays the real async work — runs in parallel and is
   dismissed immediately if the underlying action errors.
   ========================================================= */
(function () {
  "use strict";

  var MIN_VISIBLE_MS = 450;
  var MESSAGE_KEYS = ["loading.message1", "loading.message2", "loading.message3", "loading.message4"];
  var MESSAGE_TIMES = [0, 150, 600, 1100];

  var overlay = null;
  var progressBar = null;
  var percentageLabel = null;
  var statusLabel = null;
  var rafId = null;
  var messageTimers = [];
  var startedAt = 0;
  var activeTransitionId = 0;

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
    var pct = Math.min(100, Math.round((elapsed / MIN_VISIBLE_MS) * 100));
    if (progressBar) progressBar.style.width = pct + "%";
    if (percentageLabel) percentageLabel.textContent = pct + "%";
    if (elapsed < MIN_VISIBLE_MS) {
      rafId = window.requestAnimationFrame(tick);
    }
  }

  function clearMessageTimers() {
    messageTimers.forEach(function (id) { window.clearTimeout(id); });
    messageTimers = [];
  }

  function showOverlay() {
    if (!overlay) cacheRefs();
    if (!overlay) return Promise.resolve();

    activeTransitionId += 1;
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
    rafId = window.requestAnimationFrame(tick);
    return Promise.resolve();
  }

  function hideOverlay() {
    if (!overlay) cacheRefs();
    if (rafId) window.cancelAnimationFrame(rafId);
    clearMessageTimers();
    if (!overlay) return;
    overlay.classList.add("hidden");
    overlay.classList.remove("flex");
    document.body.style.overflow = "";
  }

  /**
   * Shows the shared DuitJom transition overlay before navigation or async work
   * and keeps it visible just long enough to avoid flicker.
   * @param {() => (void | Promise<void>)} action
   */
  window.showPageTransition = function showPageTransition(action) {
    var transitionId = activeTransitionId + 1;
    var minimumWait;
    var actionResult;

    showOverlay();
    minimumWait = new Promise(function (resolve) {
      window.setTimeout(resolve, MIN_VISIBLE_MS);
    });

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
        function () {
          if (transitionId === activeTransitionId) hideOverlay();
        },
        function (error) { hideOverlay(); throw error; }
      );
    }

    return minimumWait.then(function () {
      if (transitionId === activeTransitionId) hideOverlay();
    });
  };

  window.hidePageTransition = hideOverlay;
})();
