// auth/auth-forms.js
// Small progressive-enhancement layer for the two account entry links that sit
// under the login form on index.html:
//   #registerAccountLink   -> page/register.html
//   #forgotPasswordLink    -> page/forgot-password.html
//
// The links are plain <a href> elements and therefore already work without any
// JavaScript. This module only adds two behaviours on top of that:
//   1. a visible "busy" state while the next page is fetched,
//   2. client-side routing to the SPA route when the portal is served from a
//      HashRouter-style shell, falling back to the real file otherwise.
// It is deliberately defensive: every lookup is optional so a DOM change can
// never break the login screen.

(function () {
  "use strict";

  // Single source of truth for the two destinations.
  var ACCOUNT_LINKS = {
    registerAccountLink: {
      path: "page/register.html",
      hashRoute: "#/register"
    },
    forgotPasswordLink: {
      path: "page/forgot-password.html",
      hashRoute: "#/forgot-password"
    }
  };

  function isHashRouted() {
    return typeof window.location.hash === "string" &&
      window.location.hash.indexOf("#/") === 0;
  }

  function setPendingState(link) {
    if (!link || link.dataset.pending === "true") return;
    link.dataset.pending = "true";
    link.setAttribute("aria-busy", "true");
  }

  function clearPendingState(link) {
    if (!link) return;
    link.dataset.pending = "false";
    link.removeAttribute("aria-busy");
  }

  Object.keys(ACCOUNT_LINKS).forEach(function (id) {
    var link = document.getElementById(id);
    if (!link) return;

    // Restore the anchor state if the user comes back with the bfcache.
    window.addEventListener("pageshow", function () {
      clearPendingState(link);
    });

    link.addEventListener("click", function (event) {
      // Respect the user's intent: modified clicks open a new tab/window and
      // must keep their native behaviour.
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      var target = ACCOUNT_LINKS[id];

      if (isHashRouted()) {
        event.preventDefault();
        window.location.hash = target.hashRoute;
        return;
      }

      // Normal multi-page navigation: only surface the busy state.
      setPendingState(link);
    });
  });
}());
