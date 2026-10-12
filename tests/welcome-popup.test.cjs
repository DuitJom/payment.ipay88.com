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
      id, dataset: {copy: values['data-copy']}, style: {}, hidden: false, isConnected: true, textContent: "", naturalWidth: 1024, complete: true,
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
  popup.querySelectorAll = selector => selector === '[data-copy]' ? controls.filter(el => el.dataset.copy) : controls;
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
    assert.deepEqual(buffer.range, [0, buffer.value.length]);
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

test("welcome appears with 60s, counts down and closes at sixty seconds", () => {
  const h = setup();
  assert.equal(h.get("welcomePopup").getAttribute("aria-hidden"), "false");
  assert.equal(h.get("welcomePopupClose").textContent, "Tutup 60s");
  assert.equal(h.document.body.classList.contains("welcome-popup-open"), true);
  h.flushFrames();
  assert.equal(h.document.activeElement, h.get("welcomePopupCloseX"));
  h.advance(1000);
  assert.equal(h.get("welcomePopupClose").textContent, "Tutup 59s");
  h.advance(58000);
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
    assert.equal(h.get("welcomePopupClose").textContent, "Tutup 60s", close);
  }
});

test("returning from a backgrounded phone app uses elapsed time rather than delayed timer ticks", async () => {
  const h = setup();
  h.document.hidden = true;
  h.advance(64000, false);
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
  assert.equal(h.get("welcomePopupImage").hidden, true);
  assert.equal(h.content.classList.contains("welcome-without-image"), true);
  assert.equal(h.get("welcomePopup").getAttribute("aria-hidden"), "false");
});

test("email, WhatsApp and the uploaded poster are wired correctly", () => {
  const h = setup({ readyState: "complete" });
  assert.equal(h.get("welcomePopupSupport").getAttribute("href"), "mailto:support@duitjom.my?subject=Hi%20PM-PerlukanBantuan&amp;body=Hi%20PM-PerlukanBantuan");
  assert.equal(h.get("welcomePopupWhatsApp").getAttribute("href"), "https://wa.me/601168462807");
  assert.equal(h.get("welcomePopupImage").getAttribute("src"), "images/IMG_0189.png");
  assert.ok(fs.existsSync(path.join(root, h.get("welcomePopupImage").getAttribute("src"))));
  assert.match(html, /js\/welcome-popup\.js\?v=20261012-popup2/);
  assert.match(html, /css\/welcome-popup\.css\?v=20261012-popup2/);
});

test("all three copy targets handle clipboard success, denial and missing API", async () => {
  for (const clipboard of ["ok", "missing", "denied"]) {
    const h = setup({clipboard});
    for (const [id, value] of [["welcomeCopyEmail", "support@duitjom.my"], ["welcomeCopyCom", "www.duitjom.com"], ["welcomeCopyMy", "www.duitjom.my"]]) {
      await h.get(id).click();
      assert.equal((clipboard === "ok" ? h.copied : h.fallbackCopies).at(-1), value);
      assert.match(h.get("welcomeCopyStatus").textContent, /Berjaya disalin/);
    }
    assert(h.buffers.every(buffer => !buffer.isConnected));
  }
});
test("blocked copying reports failure instead of success", async () => {
  const h = setup({clipboard:"missing", fallback:false});
  await h.get("welcomeCopyEmail").click();
  assert.match(h.get("welcomeCopyStatus").textContent, /Tidak dapat menyalin/);
  assert(h.buffers.every(buffer => !buffer.isConnected));
});
