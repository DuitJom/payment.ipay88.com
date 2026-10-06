// Run: node --test tests/payment-selection.test.cjs
// Exercise the payment controller with its real HTML and a minimal DOM.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "components/payment.html"), "utf8");
const code = fs.readFileSync(path.join(root, "components/payment.js"), "utf8");

function setup(query = "?nama=Pelanggan%20Ujian&id=DJ20260001&jumlah=350.50", blockedStorage = false) {
  let now = Date.UTC(2026, 9, 6, 18, 30);
  const nodes = new Map(), intervals = new Map(), timeouts = new Map(), events = {};
  let timerId = 0;
  function element(id, attrs = "") {
    const classes = new Set((attrs.match(/class="([^"]*)"/)?.[1] || "").split(/\s+/));
    const listeners = {};
    return {
      id, hidden: /\bhidden\b/.test(attrs), disabled: /\bdisabled\b/.test(attrs),
      textContent: "", value: "", files: [], style: {}, attrs: {}, open: false,
      clicks: 0, focus() { document.activeElement = this; },
      setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return this.attrs[k]; },
      addEventListener(k, fn) { (listeners[k] ||= []).push(fn); },
      dispatch(k, event = {}) { for (const fn of listeners[k] || []) fn(event); },
      click() { this.clicks++; this.dispatch("click"); },
      showModal() { this.open = true; }, close() { this.open = false; this.dispatch("close"); },
      querySelector() { return { focus() {} }; },
      classList: {
        add: v => classes.add(v), remove: v => classes.delete(v),
        contains: v => classes.has(v),
        toggle(v, enabled) { if (enabled ?? !classes.has(v)) classes.add(v); else classes.delete(v); }
      }
    };
  }
  for (const match of html.matchAll(/<\w+\b([^>]*\bid="([^"]+)"[^>]*)>/g)) nodes.set(match[2], element(match[2], match[1]));
  const tabs = element("tabs");
  const document = {
    baseURI: "https://www.duitjom.my/components/payment.html", hidden: false,
    getElementById: id => nodes.get(id), querySelector: () => tabs,
    addEventListener(k, fn) { events[k] = fn; }
  };
  nodes.get("countdown").parentElement = element("timer");
  const storage = new Map();
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
  const context = vm.createContext({
    document, Date: Clock, URL, URLSearchParams, Intl, Math, Number, String,
    sessionStorage: {
      getItem(k) { if (blockedStorage) throw Error("disabled"); return storage.get(k); },
      setItem(k, v) { if (blockedStorage) throw Error("disabled"); storage.set(k, v); }
    },
    window: { location: { search: query }, scrollTo() {}, addEventListener() {}, open() {} },
    requestAnimationFrame(fn) { fn(); },
    setInterval(fn) { const id = ++timerId; intervals.set(id, fn); return id; },
    clearInterval(id) { intervals.delete(id); },
    setTimeout(fn) { const id = ++timerId; timeouts.set(id, fn); return id; },
    clearTimeout(id) { timeouts.delete(id); }
  });
  vm.runInContext(code, context);
  return {
    get: id => nodes.get(id), run: expression => vm.runInContext(expression, context),
    advance(seconds) { now += seconds * 1000; for (const fn of [...intervals.values()]) fn(); },
    intervals, timeouts
  };
}

test("selecting a bank closes the open picker, updates its label and enables Continue", () => {
  const h = setup();
  assert.equal(h.get("continueBtn").disabled, true);
  h.run("toggleDropdown()");
  assert.equal(h.get("dropdownList").open, true);
  assert.equal(h.get("dropdownBtn").getAttribute("aria-expanded"), "true");
  h.run("selectBank('maybank_qr')");
  assert.equal(h.get("dropdownList").open, false);
  assert.equal(h.get("dropdownBtn").getAttribute("aria-expanded"), "false");
  assert.equal(h.get("dropdownText").textContent, "Maybank QRPay");
  assert.equal(h.get("selectedCard").hidden, false);
  assert.equal(h.get("continueBtn").disabled, false);
  assert.equal(h.get("continueText").textContent, "Teruskan · RM 350.50");
});

test("switching payment methods clears the old bank; transfer opens support", () => {
  const h = setup();
  h.run("selectBank('tng'); switchTab('online')");
  assert.equal(h.get("selectedCard").hidden, true);
  assert.equal(h.get("continueBtn").disabled, true);
  h.run("selectBank('tng'); goToQR()");
  assert.equal(h.get("qrPage").hidden, true);
  h.run("toggleDropdown(); selectBank('cimb_online')");
  assert.equal(h.get("dropdownList").open, false);
  assert.equal(h.get("continueBtn").disabled, false);
  h.run("switchTab('transfer')");
  assert.equal(h.get("transferModal").open, true);
  assert.equal(h.get("dropdownBtn").disabled, true);
  assert.equal(h.get("continueBtn").disabled, true);
});

test("QR tap opens the large preview and starts one unchanged same-origin download", () => {
  const h = setup();
  h.run("selectBank('tng'); goToQR()");
  assert.equal(h.get("selectionPage").hidden, true);
  assert.equal(h.get("qrPage").hidden, false);
  assert.equal(h.get("qrJumlah").textContent, "350.50");
  assert.equal(h.get("countdown").textContent, "1:59");
  assert.equal(h.get("qrRefDisplay").textContent, h.get("noRefDisplay").textContent);
  h.run("openQRPreview()");
  assert.equal(h.get("qrPreview").open, true);
  assert.equal(h.get("qrDownloadLink").clicks, 1);
  assert.equal(h.get("qrDownloadLink").href, "https://www.duitjom.my/F534F3AA-ACF5-40DB-BEF0-7300EC9FA735.jpeg");
  assert.match(h.get("qrDownloadLink").download, /^DuitJom-QR-iP8-[0-9]{8}-DJO\.jpeg$/);
  assert.equal(h.get("qrDownloadButton").href, h.get("qrDownloadLink").href);
  h.run("closeQRPreview()");
  assert.equal(h.get("qrPreview").open, false);
});

test("returning and countdown expiry close the preview and reset the next session", () => {
  const h = setup();
  h.run("selectBank('tng'); goToQR(); openQRPreview()");
  h.advance(12);
  assert.equal(h.get("countdown").textContent, "1:47");
  h.run("backToSelection(); goToQR()");
  assert.equal(h.get("countdown").textContent, "1:59");
  h.run("openQRPreview()");
  h.advance(120);
  assert.equal(h.get("qrPage").hidden, true);
  assert.equal(h.get("qrPreview").open, false);
  assert.equal(h.get("selectionPage").hidden, false);
  assert.equal(h.get("pageNotice").hidden, false);
});

test("invalid amounts cannot continue; valid decimal amounts and blocked storage work", () => {
  for (const amount of ["-10", "0", "NaN", "Infinity", ""]) {
    const h = setup("?jumlah=" + amount);
    h.run("selectBank('tng'); goToQR()");
    assert.equal(h.get("continueBtn").disabled, true);
    assert.equal(h.get("qrPage").hidden, true);
  }
  const h = setup("?jumlah=1000.25", true);
  h.run("selectBank('tng'); goToQR()");
  assert.equal(h.get("qrJumlah").textContent, "1,000.25");
});

test("clearing a receipt disables its action and invalid files display a validation error", () => {
  const h = setup();
  h.get("fileInput").files = [{ name: "receipt.pdf", type: "application/pdf", size: 1234 }];
  h.run("onFileSelected(document.getElementById('fileInput'))");
  assert.equal(h.get("uploadBtn").disabled, false);
  h.get("fileInput").files = [];
  h.run("onFileSelected(document.getElementById('fileInput'))");
  assert.equal(h.get("uploadBtn").disabled, true);
  h.get("fileInput").files = [{ name: "bad.exe", type: "application/octet-stream", size: 1234 }];
  h.run("onFileSelected(document.getElementById('fileInput'))");
  assert.equal(h.get("fileError").hidden, false);
  assert.equal(h.get("uploadBtn").disabled, true);
});

test("HTML contains no leaked editing notes and uses distinct element IDs", () => {
  assert(!html.includes("TAMBAH INI"));
  assert(!html.includes("tutup .fixed bottom-0"));
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size);
});
