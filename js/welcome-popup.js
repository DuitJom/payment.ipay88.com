/* Welcome popup is independent of login, payment and navigation. */
(function () {
  "use strict";

  function initWelcomePopup() {
    const overlay = document.getElementById("welcomePopup");
    const popup = overlay?.querySelector(".welcome-popup");
    const closeButton = document.getElementById("welcomePopupClose");
    const closeX = document.getElementById("welcomePopupCloseX");
    const copyButton = document.getElementById("welcomePopupCopyEmail");
    const copyStatus = document.getElementById("welcomePopupCopyStatus");
    if (!overlay || !popup || !closeButton || !closeX || overlay.dataset.initialized) return;
    overlay.dataset.initialized = "true";

    const previousFocus = document.activeElement;
    const deadline = Date.now() + 10000;
    let interval = null;
    let autoClose = null;
    let isOpen = true;

    function closePopup() {
      if (!isOpen) return;
      isOpen = false;
      window.clearInterval(interval);
      window.clearTimeout(autoClose);
      overlay.setAttribute("aria-hidden", "true");
      document.body.classList.remove("welcome-popup-open");
      if (previousFocus?.isConnected && typeof previousFocus.focus === "function") {
        previousFocus.focus({ preventScroll: true });
      }
    }

    function updateCountdown() {
      if (!isOpen) return;
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      closeButton.textContent = `Tutup ${seconds}s`;
      if (seconds === 0) closePopup();
    }

    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("welcome-popup-open");
    updateCountdown();
    interval = window.setInterval(updateCountdown, 1000);
    autoClose = window.setTimeout(closePopup, 10000);
    window.requestAnimationFrame(function () {
      if (isOpen) closeX.focus({ preventScroll: true });
    });

    closeButton.addEventListener("click", closePopup);
    closeX.addEventListener("click", closePopup);
    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) closePopup();
    });

    document.addEventListener("keydown", function (event) {
      if (!isOpen) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closePopup();
      } else if (event.key === "Tab") {
        const controls = Array.from(popup.querySelectorAll('button:not([disabled]), a[href]'));
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (!first) return;
        if (event.shiftKey && (document.activeElement === first || !popup.contains(document.activeElement))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !popup.contains(document.activeElement))) {
          event.preventDefault();
          first.focus();
        }
      }
    });
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) updateCountdown();
    });
    window.addEventListener("pageshow", updateCountdown);
    window.addEventListener("pagehide", closePopup);

    const poster = document.getElementById("welcomePopupImage");
    function hideFailedPoster() {
      const artwork = popup.querySelector(".welcome-artwork");
      if (artwork) artwork.hidden = true;
      popup.querySelector(".welcome-content")?.classList.add("welcome-without-image");
    }
    poster?.addEventListener("error", hideFailedPoster);
    if (poster?.complete && poster.naturalWidth === 0) hideFailedPoster();

    function copyWithSelection(email) {
      const focusBeforeCopy = document.activeElement;
      const buffer = document.createElement("textarea");
      buffer.value = email;
      buffer.readOnly = true;
      buffer.className = "welcome-copy-buffer";
      buffer.setAttribute("aria-hidden", "true");
      popup.appendChild(buffer);
      let copied;
      try {
        buffer.select();
        buffer.setSelectionRange(0, email.length);
        copied = document.execCommand("copy");
      } finally {
        buffer.remove();
        if (isOpen) focusBeforeCopy?.focus({ preventScroll: true });
      }
      if (!copied) throw new Error("Copy unavailable");
    }

    copyButton?.addEventListener("click", async function () {
      if (!copyStatus) return;
      const email = "support@duitjom.my";
      copyStatus.textContent = "";
      try {
        if (navigator.clipboard?.writeText) {
          try {
            await navigator.clipboard.writeText(email);
          } catch (_) {
            copyWithSelection(email);
          }
        } else {
          copyWithSelection(email);
        }
        copyStatus.textContent = "Emel disalin.";
      } catch (_) {
        copyStatus.textContent = "Tekan lama alamat emel untuk menyalinnya.";
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWelcomePopup, { once: true });
  } else {
    initWelcomePopup();
  }
})();
