// Run: node --test tests/welcome-popup.test.cjs
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const markup = html.slice(html.indexOf('<div id="welcomePopup"'), html.indexOf('<div id="sidebar-container"'));
const code = fs.readFileSync(path.join(root, "js/welcome-popup.js"), "utf8");

function setup({ clipboard = "ok", fallback = true, readyState = "loading" } = {}) {
  let now = 100000, nextTimer = 0;
  const intervals = new Map(), timeouts = new Map(), frames = [], nodes = new Map();
  const copied = [], fallbackCopies = [], buffers = [];
  function element(id, attrs = "") {
    const listeners = new Map(), values = {}, classes = new Set();
    for (const m of attrs.matchAll(/([\w-]+)="([^"]*)"/g)) values[m[1]] = m[2];
    for (const value of (values.class || "").split(/\s+/)) classes.add(value);
    return {
      id, dataset: {}, hidden: false, isConnected: true, textContent: "", naturalWidth: 1024, complete: true,
      setAttribute(k, v) { values[k] = String(v); }, getAttribute(k) { return values[k]; },
      addEventListener(k, fn) { if (!listeners.has(k)) listeners.set(k, []); listeners.get(k).push(fn); },
      dispatch(k, event = {}) { return Promise.all((listeners.get(k) || []).map(fn => fn(event))); },
      focus() { document.activeElement = this; },
      click() { return this.dispatch("click", { target: this }); },
      classList: { add(v) { classes.add(v); }, remove(v) { classes.delete(v); }, contains(v) { return classes.has(v); } },
      select() { document.activeElement = this; this.selected = true; },
      setSelectionRange(start, end) { this.range = [start, end]; },
      remove() { this.isConnected = false; }
    };
  }
  for (const m of markup.matchAll(/<\w+\b([^>]*\bid="([^"]+)"[^>]*)>/g)) nodes.set(m[2], element(m[2], m[1]));
  const popup = element("dialog"), artwork = element("artwork"), content = element("content");
  const controls = [...markup.matchAll(/<(?:button|a)\b[^>]*\bid="([^"]+)"[^>]*>/g)].map(m => nodes.get(m[1]));
  popup.querySelectorAll = () => controls;
  popup.querySelector = selector => selector === ".welcome-artwork" ? artwork : content;
  popup.contains = node => node === popup || controls.includes(node);
  popup.appendChild = node => buffers.push(node);
  nodes.get("welcomePopup").querySelector = () => popup;
  const document = element("document");
  document.readyState = readyState;
  document.hidden = false;
  document.body = element("body");
  const previousFocus = element("login-button");
  document.activeElement = previousFocus;
  document.getElementById = id => nodes.get(id);
  document.createElement = () => element("buffer");
  document.execCommand = action => {
    assert.equal(action, "copy");
    const buffer = buffers[buffers.length - 1];
    fallbackCopies.push(buffer.value);
    assert.equal(buffer.selected, true);
    assert.deepEqual(buffer.range, [0, "support@duitjom.my".length]);
    return fallback;
  };
  const window = element("window");
  Object.assign(window, {
    setInterval(fn) { const id = ++nextTimer; intervals.set(id, fn); return id; },
    clearInterval(id) { intervals.delete(id); },
    setTimeout(fn, delay) { const id = ++nextTimer; timeouts.set(id, { fn, at: now + delay }); return id; },
    clearTimeout(id) { timeouts.delete(id); },
    requestAnimationFrame(fn) { frames.push(fn); }
  });
  const navigator = clipboard === "missing" ? {} : {
    clipboard: { async writeText(text) { if (clipboard === "denied") throw Error("Permission denied"); copied.push(text); } }
  };
  const context = vm.createContext({ document, window, navigator, Date: { now: () => now }, Array, Math, Error });
  vm.runInContext(code, context);
  if (readyState === "loading") document.dispatch("DOMContentLoaded");
  return {
    get: id => nodes.get(id), popup, artwork, content, document, window, previousFocus,
    intervals, timeouts, frames, copied, fallbackCopies, buffers,
    flushFrames() { while (frames.length) frames.shift()(); },
    advance(ms, runTimers = true) {
      now += ms;
      if (runTimers) {
        for (const fn of [...intervals.values()]) fn();
        for (const [id, timer] of [...timeouts]) if (timer.at <= now) { timeouts.delete(id); timer.fn(); }
      }
    }
  };
}

test("welcome appears with 10s, counts down and closes at ten seconds", () => {
  const h = setup();
  assert.equal(h.get("welcomePopup").getAttribute("aria-hidden"), "false");
  assert.equal(h.get("welcomePopupClose").textContent, "Tutup 10s");
  assert.equal(h.document.body.classList.contains("welcome-popup-open"), true);
  h.flushFrames();
  assert.equal(h.document.activeElement, h.get("welcomePopupCloseX"));
  h.advance(1000);
  assert.equal(h.get("welcomePopupClose").textContent, "Tutup 9s");
  h.advance(8000);
  assert.equal(h.get("welcomePopupClose").textContent, "Tutup 1s");
  h.advance(999);
  assert.equal(h.get("welcomePopup").getAttribute("aria-hidden"), "false");
  h.advance(1);
  assert.equal(h.get("welcomePopup").getAttribute("aria-hidden"), "true");
  assert.equal(h.document.activeElement, h.previousFocus);
  assert.equal(h.document.body.classList.contains("welcome-popup-open"), false);
  assert.equal(h.intervals.size + h.timeouts.size, 0);
});

test("close button, red X, Escape and backdrop close immediately and cancel both timers", async () => {
  for (const close of ["button", "x", "escape", "backdrop"]) {
    const h = setup();
    if (close === "button") await h.get("welcomePopupClose").click();
    if (close === "x") await h.get("welcomePopupCloseX").click();
    if (close === "escape") await h.document.dispatch("keydown", { key: "Escape", preventDefault() {} });
    if (close === "backdrop") await h.get("welcomePopup").click();
    h.flushFrames();
    assert.equal(h.get("welcomePopup").getAttribute("aria-hidden"), "true", close);
    assert.equal(h.intervals.size + h.timeouts.size, 0, close);
    assert.equal(h.document.activeElement, h.previousFocus, close);
    h.advance(15000);
    assert.equal(h.get("welcomePopupClose").textContent, "Tutup 10s", close);
  }
});

test("returning from a backgrounded phone app uses elapsed time rather than delayed timer ticks", async () => {
  const h = setup();
  h.document.hidden = true;
  h.advance(14000, false);
  h.document.hidden = false;
  await h.document.dispatch("visibilitychange");
  assert.equal(h.get("welcomePopup").getAttribute("aria-hidden"), "true");
  assert.equal(h.intervals.size + h.timeouts.size, 0);
});

test("Tab stays inside the popup and a failed poster leaves the support controls available", async () => {
  const h = setup();
  let prevented = 0;
  h.get("welcomePopupCloseX").focus();
  await h.document.dispatch("keydown", { key: "Tab", shiftKey: true, preventDefault() { prevented++; } });
  assert.equal(h.document.activeElement, h.get("welcomePopupSupport"));
  await h.document.dispatch("keydown", { key: "Tab", shiftKey: false, preventDefault() { prevented++; } });
  assert.equal(h.document.activeElement, h.get("welcomePopupCloseX"));
  assert.equal(prevented, 2);
  await h.get("welcomePopupImage").dispatch("error");
  assert.equal(h.artwork.hidden, true);
  assert.equal(h.content.classList.contains("welcome-without-image"), true);
  assert.equal(h.get("welcomePopup").getAttribute("aria-hidden"), "false");
});

test("copy button copies exactly the requested support email and reports success", async () => {
  const h = setup();
  await h.get("welcomePopupCopyEmail").click();
  assert.deepEqual(h.copied, ["support@duitjom.my"]);
  assert.equal(h.get("welcomePopupCopyStatus").textContent, "Emel disalin.");
  assert.equal(h.get("welcomePopup").getAttribute("aria-hidden"), "false");
});

test("copy handles missing/denied Clipboard API and a fully blocked copy operation", async () => {
  for (const clipboard of ["missing", "denied"]) {
    const h = setup({ clipboard });
    h.get("welcomePopupCopyEmail").focus();
    await h.get("welcomePopupCopyEmail").click();
    assert.deepEqual(h.fallbackCopies, ["support@duitjom.my"]);
    assert.equal(h.buffers[0].isConnected, false);
    assert.equal(h.document.activeElement, h.get("welcomePopupCopyEmail"));
    assert.equal(h.get("welcomePopupCopyStatus").textContent, "Emel disalin.");
  }
  const blocked = setup({ clipboard: "denied", fallback: false });
  await blocked.get("welcomePopupCopyEmail").click();
  assert.equal(blocked.get("welcomePopupCopyStatus").textContent, "Tekan lama alamat emel untuk menyalinnya.");
});

test("email links use the phone's mail handler, application goes to duitjom.com, and the new asset is wired", () => {
  const h = setup({ readyState: "complete" });
  assert.equal(h.get("welcomePopupSupport").getAttribute("href"), "mailto:support@duitjom.my");
  assert.equal(h.get("welcomePopupEmail").getAttribute("href"), "mailto:support@duitjom.my");
  assert.equal(h.get("welcomePopupWebsite").getAttribute("href"), "https://www.duitjom.com/");
  assert.equal(h.get("welcomePopupImage").getAttribute("src"), "images/4602E986-7085-4B0D-B540-AF33DA5C2EAF.png");
  assert.match(html, /src="js\/welcome-popup\.js\?v=20261006-welcome"/);
  assert.match(html, /href="css\/welcome-popup\.css\?v=20261006-welcome"/);
  assert.doesNotMatch(markup, /sedang dibaiki|maintenance-hotspot/);
});
