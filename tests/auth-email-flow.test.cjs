// Run: node --experimental-vm-modules --test tests/auth-email-flow.test.cjs
// Browser behavior is simulated; the actual controller, Worker, SQL and crypto run.
const vm = require("node:vm"), fs = require("node:fs"), path = require("node:path");
const { pathToFileURL } = require("node:url");
const test = require("node:test"), assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const originalFetch = globalThis.fetch, originalNow = Date.now, originalLog = console.log;
let clock = Date.UTC(2026, 9, 2, 18, 0, 0);
const providers = new Map();
let harnessId = 0;
function providerFetch(url, options) {
  const state = String(url).includes("/turnstile/")
    ? providers.get(JSON.parse(options.body).secret)
    : providers.get(Buffer.from(options.headers.Authorization.slice(6), "base64").toString().split(":")[0]);
  if (!state) throw new Error("Unexpected provider call");
  return state.provider(url, options);
}
test.after(() => { globalThis.fetch = originalFetch; Date.now = originalNow; console.log = originalLog; });
class Events {
  constructor() { this.listeners = {}; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  dispatchEvent(event) { event.target = this; event.preventDefault ||= () => { event.defaultPrevented = true; }; for (const fn of this.listeners[event.type] || []) fn(event); }
}
class Element extends Events {
  constructor(tag, attrs, text, doc) {
    super(); this.tagName = tag; this.attrs = attrs; this.textContent = text; this.doc = doc;
    this.hidden = "hidden" in attrs; this.disabled = "disabled" in attrs; this.value = "";
    this.classes = new Set((attrs.class || "").split(/\s+/));
    this.classList = {
      add: (...values) => values.forEach(value => this.classes.add(value)),
      remove: (...values) => values.forEach(value => this.classes.delete(value)),
      contains: value => this.classes.has(value),
      toggle: (value, enabled) => { enabled ??= !this.classes.has(value); if (enabled) this.classes.add(value); else this.classes.delete(value); return enabled; }
    };
  }
  getAttribute(name) { return this.attrs[name] ?? null; }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  focus() { this.doc.activeElement = this; }
  scrollIntoView() {}
  click() { if (!this.disabled) this.dispatchEvent({ type: "click" }); }
}
class Document extends Events {
  constructor(html) {
    super(); this.nodes = [];
    const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
    for (const match of markup.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*)>([^<]*)/gi)) {
      const attrs = {};
      for (const attr of match[2].matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s/>]+)))?/g)) {
        attrs[attr[1]] = (attr[2] ?? attr[3] ?? attr[4] ?? "").replaceAll("&amp;", "&");
      }
      this.nodes.push(new Element(match[1], attrs, match[3].replaceAll("&amp;", "&"), this));
    }
    this.documentElement = this.nodes.find(node => node.tagName === "html");
  }
  getElementById(id) { return this.nodes.find(node => node.attrs.id === id) || null; }
  querySelectorAll(selector) {
    if (selector.startsWith("[")) return this.nodes.filter(node => selector.slice(1, -1) in node.attrs);
    if (selector.startsWith(".")) return this.nodes.filter(node => node.classes.has(selector.slice(1)));
    return [];
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}
const pause = () => new Promise(resolve => setTimeout(resolve, 5));
async function until(predicate, message) {
  for (let index = 0; index < 200; index++) { if (predicate()) return; await pause(); }
  assert.fail(message || "Expected state did not arrive");
}
async function setup(options = {}) {
  const { handleEmailAuth } = await import(pathToFileURL(path.join(root, "workers/email-auth/otp-worker.js")));
  const support = await import(pathToFileURL(path.join(root, "workers/email-auth/test-support.js")));
  globalThis.fetch = providerFetch; Date.now = () => clock; console.log = () => {};
  const env = options.env || support.testEnvironment(), jar = options.jar || { value: "" };
  const state = { ...support.providerState(), calls: [], transitions: 0, signOuts: 0, intervals: new Map(), settled: 0 };
  state.provider = support.providerMock(state);
  providers.set(env.TURNSTILE_SECRET_KEY, state); providers.set(env.MJ_APIKEY_PUBLIC, state);
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const document = new Document(html), window = new Events();
  const stored = new Map(options.stored ? [["duitjom_session", JSON.stringify(options.stored)]] : []);
  const localStorage = {
    getItem: key => { if (options.blockedStorage) throw Error("disabled"); return stored.get(key) || null; },
    setItem: (key, value) => { if (options.blockedStorage) throw Error("disabled"); stored.set(key, String(value)); },
    removeItem: key => { if (options.blockedStorage) throw Error("disabled"); stored.delete(key); }
  };
  window.localStorage = localStorage; window.location = { search: options.search || "", origin: "https://www.duitjom.my" };
  window.scrollTo = () => {}; window.showPageTransition = action => { state.transitions++; action(); };
  const fetch = async (url, init) => {
    const route = new URL(url).pathname;
    state.calls.push({ route, credentials: init.credentials, body: init.body ? JSON.parse(init.body) : null });
    if (options.apiOffline) throw new TypeError("simulated API unavailable");
    if (route === "/api/verify-otp" && state.verificationGate) await state.verificationGate;
    const headers = { ...init.headers, Origin: "https://www.duitjom.my", "CF-Connecting-IP": "203.0.113.10" };
    if (init.credentials === "include" && jar.value) headers.Cookie = jar.value;
    const response = await handleEmailAuth(new Request(url, { ...init, headers }), env, {});
    const cookie = response.headers.get("Set-Cookie");
    if (init.credentials === "include" && cookie && !options.blockedCookies) jar.value = cookie.split(";")[0];
    state.settled++;
    return response;
  };
  let currentUser = options.initialUser || null;
  const firebase = {
    auth: {}, authPersistenceReady: Promise.resolve(), googleProvider: {},
    onAuthStateChanged: (auth, listener) => { state.authCallback = listener; listener(currentUser); },
    signOut: async () => { state.signOuts++; currentUser = null; state.authCallback?.(null); },
    signInWithPopup: async () => { currentUser = { email: "google@example.com", emailVerified: true, providerData: [{ providerId: "google.com" }] }; state.authCallback(currentUser); return { user: currentUser }; }
  };
  const context = vm.createContext({
    window, document, localStorage, Date: class extends Date { static now() { return clock; } },
    fetch, AbortController, URLSearchParams, setTimeout, clearTimeout,
    console: { log() {}, warn() {}, error() {} },
    setInterval: fn => { const id = state.intervals.size + 1; state.intervals.set(id, fn); return id; },
    clearInterval: id => state.intervals.delete(id),
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init?.detail; } }
  });
  for (const filename of ["i18n/translations.js", "i18n/i18n.js", "auth/otp-turnstile.js"]) vm.runInContext(fs.readFileSync(path.join(root, filename), "utf8"), context);
  vm.runInContext(html.match(/<script>\s*(function backToMainFromPayment[\s\S]*?)<\/script>/)[1], context);
  window.goToPaymentPage = vm.runInContext("goToPaymentPage", context);
  const cache = {};
  async function importer(specifier) {
    if (options.firebaseOffline) throw Error("SDK unavailable");
    if (!cache[specifier]) {
      const values = specifier.includes("firebase-config") ? firebase : { getRedirectResult: async () => null };
      const module = new vm.SyntheticModule(Object.keys(values), function () { for (const [key, value] of Object.entries(values)) this.setExport(key, value); }, { context });
      await module.link(() => {}); await module.evaluate(); cache[specifier] = module;
    }
    return cache[specifier];
  }
  const module = new vm.SourceTextModule(fs.readFileSync(path.join(root, "auth/app-auth.js"), "utf8"), { context, importModuleDynamically: importer });
  await module.link(() => {}); await module.evaluate(); document.dispatchEvent({ type: "DOMContentLoaded" });
  await until(() => state.settled >= 1 || options.apiOffline || options.stored?.provider === "google", "session lookup did not finish");
  await pause();
  const get = id => document.getElementById(id), inputs = document.querySelectorAll("[data-login-otp]");
  const input = (node, value) => { node.value = value; node.dispatchEvent({ type: "input" }); };
  const id = ++harnessId; let tokenNumber = 0;
  async function send(email = "customer@example.com") {
    if (get("emailLoginForm").hidden) get("emailToggleButton").click();
    input(get("emailInput"), email); window.onLoginTurnstileSuccess(`test-token-${id}-${++tokenNumber}`);
    get("emailLoginForm").dispatchEvent({ type: "submit" });
    await until(() => get("emailLoginForm").getAttribute("aria-busy") === "false");
  }
  async function verify(otp = support.latestOtp(state)) {
    input(inputs[0], otp); get("verifyOtpButton").click();
    await until(() => get("emailLoginForm").getAttribute("aria-busy") === "false");
  }
  return { env, jar, state, get, inputs, input, send, verify, window, context, stored,
    advance: seconds => { clock += seconds * 1000; for (const fn of [...state.intervals.values()]) fn(); } };
}
test("email OTP, Continue/back, server recheck, locale and logout use actual Worker SQL", async () => {
  const h = await setup({ initialUser: { email: "old@example.com", emailVerified: false, providerData: [{ providerId: "password" }] } });
  assert.equal(h.get("authLoginPanel").hidden, false);
  await h.send(); await h.verify();
  assert.equal(h.window.canContinueToPayment(), true);
  assert.equal(h.get("authUserPanel").hidden, false);
  assert(!h.get("userDisplay").textContent.includes("@"));
  assert(h.state.calls.every(call => call.credentials === "include"));
  h.get("authContinueButton").click();
  await until(() => h.state.transitions === 1);
  assert.equal(h.get("paymentPage").classes.has("hidden"), false);
  vm.runInContext("backToMainFromPayment()", h.context);
  const transitionsBeforeRecheck = h.state.transitions;
  for (const locale of ["ms", "en", "zh"]) {
    h.window.DJ_I18N.setLocale(locale);
    assert.equal(h.get("authContinueButton").textContent, { ms: "Teruskan", en: "Continue", zh: "继续" }[locale]);
    assert(!h.get("resendOtpButton").textContent.includes("auth."));
  }
  h.env.AUTH_DB.sqlite.exec("DELETE FROM email_auth_sessions");
  h.get("authContinueButton").click();
  await until(() => h.get("authLoginPanel").hidden === false);
  assert.equal(h.state.transitions, transitionsBeforeRecheck);
  await h.window.logoutUser(); assert.equal(h.window.canContinueToPayment(), false);
});
test("one-page registration works without storage; cookies restore it, forged storage cannot", async () => {
  const h = await setup({ search: "?auth=email&intent=register", blockedStorage: true, firebaseOffline: true });
  assert.equal(h.get("emailLoginForm").hidden, false);
  for (const locale of ["ms", "zh", "en"]) { h.window.DJ_I18N.setLocale(locale); assert.equal(h.window.DJ_I18N.getLocale(), locale); }
  await h.send("new@example.com"); await h.verify();
  h.get("authContinueButton").click(); await until(() => h.state.transitions === 1);
  const returned = await setup({ env: h.env, jar: h.jar, blockedStorage: true, search: "?step=payment" });
  await until(() => returned.state.transitions === 1);
  const forged = await setup({ stored: { email: "forged@example.com", provider: "otp", verified: true, loginAt: clock }, search: "?step=payment" });
  assert.equal(forged.window.canContinueToPayment(), false);
  assert.equal(forged.state.transitions, 0);
});
test("bad OTP, provider error, blocked cookies and resend cooldown never open access", async () => {
  const h = await setup();
  await h.send();
  h.window.onLoginTurnstileSuccess("unused-token");
  assert.equal(h.get("emailLoginButton").disabled, true);
  h.advance(61); assert.equal(h.get("resendOtpButton").disabled, false);
  const correct = h.state.mailjetCalls[0].Messages[0].TextPart.match(/\b[0-9]{6}\b/)[0];
  await h.verify(correct === "000000" ? "000001" : "000000");
  assert.equal(h.window.canContinueToPayment(), false);
  const failed = await setup(); failed.state.mailjetError = true; await failed.send();
  assert.equal(failed.get("verifyOtpButton").disabled, true);
  assert.equal(failed.window.canContinueToPayment(), false);
  const noCookies = await setup({ blockedCookies: true }); await noCookies.send(); await noCookies.verify();
  assert.equal(noCookies.window.canContinueToPayment(), false);
  assert.equal(noCookies.get("authLoginPanel").hidden, false);
});
test("logout cancels a late verification at the server as well as the UI", async () => {
  const h = await setup(); await h.send();
  let release;
  h.state.verificationGate = new Promise(resolve => { release = resolve; });
  h.input(h.inputs[0], h.state.mailjetCalls[0].Messages[0].TextPart.match(/\b[0-9]{6}\b/)[0]);
  h.get("verifyOtpButton").click();
  await until(() => h.state.calls.some(call => call.route === "/api/verify-otp"));
  await h.window.logoutUser(); release(); await pause(); await pause();
  assert.equal(h.window.canContinueToPayment(), false);
  assert.equal(h.env.AUTH_DB.sqlite.prepare("SELECT COUNT(*) AS n FROM email_auth_sessions").get().n, 0);
});
test("Google remains independent of an email Worker outage", async () => {
  const h = await setup({ apiOffline: true });
  h.get("googleLoginButton").click(); await until(() => h.window.canContinueToPayment());
  await h.window.logoutUser();
  assert.equal(h.state.signOuts, 1);
  assert.equal(h.window.canContinueToPayment(), false);
});
