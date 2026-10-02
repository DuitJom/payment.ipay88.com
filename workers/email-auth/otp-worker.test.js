import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import worker, { handleEmailAuth, drainWelcomeEmails, requireEmailSession } from "./otp-worker.js";
import { testEnvironment, providerMock, providerState, latestOtp } from "./test-support.js";

const originalFetch = globalThis.fetch;
const originalNow = Date.now;
const originalLog = console.log;
afterEach(() => { globalThis.fetch = originalFetch; Date.now = originalNow; console.log = originalLog; });
function system() {
  const env = testEnvironment();
  const state = providerState();
  state.logs = [];
  console.log = line => state.logs.push(JSON.parse(line));
  globalThis.fetch = providerMock(state);
  let clock = Date.UTC(2026, 9, 2, 18, 0, 0);
  Date.now = () => clock;
  let requestNumber = 0;
  const jobs = [];
  const context = { waitUntil: promise => jobs.push(promise) };
  async function call(path, body, extra = {}) {
    const request = new Request(`https://e-kyc.duitjom.my${path}`, {
      method: path === "/api/session" ? "GET" : "POST",
      headers: { Origin: "https://www.duitjom.my", "CF-Connecting-IP": "203.0.113.10", "Content-Type": "application/json", ...extra },
      body: path === "/api/session" ? undefined : JSON.stringify(body || {})
    });
    const response = await worker.fetch(request, env, context);
    return { response, data: await response.json(), request };
  }
  const send = (email = "customer@example.com", token) => call("/api/send-otp", { email, turnstileToken: token || `test-token-${++requestNumber}` });
  const verify = (email, otp, challengeId) => call("/api/verify-otp", { email, otp, challengeId });
  return { env, state, call, send, verify, jobs, advance: seconds => { clock += seconds * 1000; } };
}
const count = (system, table) => system.env.AUTH_DB.sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;

test("real SQL + HTTP flow: accepted email, verified OTP, server session, logout", async () => {
  const s = system();
  const sent = await s.send(" CUSTOMER@example.com ");
  assert.equal(sent.data.success, true);
  assert.equal(sent.data.delivery, "accepted");
  assert.equal(sent.data.resendAfter, 60);
  assert.equal(s.state.mailjetCalls[0].SandboxMode, false);
  assert.equal(s.state.mailjetCalls[0].Messages[0].To[0].Email, "customer@example.com");
  assert.match(latestOtp(s.state), /^[0-9]{6}$/);
  const verified = await s.verify("customer@example.com", latestOtp(s.state), sent.data.challengeId);
  assert.equal(verified.data.success, true);
  const cookie = verified.response.headers.get("Set-Cookie");
  assert.match(cookie, /Secure; HttpOnly; SameSite=Lax/);
  assert(!JSON.stringify(verified.data).includes(cookie.split(";")[0]));
  const cookiePair = cookie.split(";")[0];
  const session = await s.call("/api/session", null, { Cookie: cookiePair });
  assert.equal(session.data.user.email, "customer@example.com");
  assert.equal(count(s, "email_auth_users"), 1);
  const proof = await requireEmailSession(session.request, s.env);
  assert.equal(proof.email, "customer@example.com");
  const logged = JSON.stringify(s.state.logs);
  for (const privateValue of ["customer@example.com", s.env.MJ_APIKEY_PUBLIC, s.env.MJ_APIKEY_PRIVATE,
    s.env.OTP_PEPPER, s.env.TURNSTILE_SECRET_KEY, cookiePair]) assert(!logged.includes(privateValue));
  assert(!s.state.logs.some(entry => Object.values(entry).includes(latestOtp(s.state))));
  assert(s.state.logs.some(entry => entry.event === "mailjet-accepted" && entry.messageId));
  await s.call("/api/logout", { challengeId: sent.data.challengeId }, { Cookie: cookiePair });
  assert.equal((await s.call("/api/session", null, { Cookie: cookiePair })).response.status, 401);
});
test("Turnstile gets the exact frontend token, secret, IP and expected action/hostname", async () => {
  const s = system();
  await s.send();
  assert.equal(s.state.turnstileCalls[0].response, "test-token-1");
  assert.equal(s.state.turnstileCalls[0].secret, s.env.TURNSTILE_SECRET_KEY);
  assert.equal(s.state.turnstileCalls[0].remoteip, "203.0.113.10");
  assert.match(s.state.turnstileCalls[0].idempotency_key, /^[a-f0-9-]{36}$/);
});
test("Turnstile errors, replayed tokens, hostname and action mismatch never send email", async () => {
  for (const result of [
    { success: false, "error-codes": ["timeout-or-duplicate"] },
    { success: false, "error-codes": ["invalid-input-response"] },
    { success: true, hostname: "attacker.example", action: "auth" },
    { success: true, hostname: "www.duitjom.my", action: "other" }
  ]) {
    const s = system(); s.state.turnstileResult = result;
    const response = await s.send();
    assert.equal(response.response.status, 403);
    assert.equal(response.data.success, false);
    assert.equal(s.state.mailjetCalls.length, 0);
    assert.equal(count(s, "email_otp_challenges"), 0);
  }
  const s = system();
  await s.send("one@example.com", "single-use-token");
  const replay = await s.send("two@example.com", "single-use-token");
  assert.equal(replay.response.status, 403);
  assert.equal(s.state.mailjetCalls.length, 1);
});
test("bad secret is a configuration error; provider/network errors are not success", async () => {
  const s = system();
  s.state.turnstileResult = { success: false, "error-codes": ["invalid-input-secret"] };
  assert.equal((await s.send()).response.status, 503);
  s.state.turnstileResult = null; s.state.networkError = true;
  assert.equal((await s.send()).response.status, 502);
  assert.equal(s.state.mailjetCalls.length, 0);
});
test("HTTP 200 with Mailjet Status:error is a failed send and cannot verify", async () => {
  const s = system(); s.state.mailjetError = true;
  const sent = await s.send();
  assert.equal(sent.response.status, 502);
  assert.equal(sent.data.code, "MAILJET_REJECTED");
  assert.equal(sent.data.success, false);
  assert.equal((await s.verify("customer@example.com", latestOtp(s.state))).response.status, 400);
  const row = s.env.AUTH_DB.sqlite.prepare("SELECT delivery_status, consumed FROM email_otp_challenges").get();
  assert.equal(row.delivery_status, "failed");
  assert.equal(row.consumed, 1);
});
test("Mailjet HTTP errors and missing delivery metadata cannot report success", async () => {
  const s = system(); s.state.mailjetError = true; s.state.mailjetStatus = 401;
  assert.equal((await s.send()).response.status, 502);
  const next = system(); const normalFetch = globalThis.fetch;
  globalThis.fetch = (url, options) => String(url).includes("mailjet") ? Promise.resolve(Response.json({ Messages: [{ Status: "success" }] })) : normalFetch(url, options);
  assert.equal((await next.send()).response.status, 502);
});
test("server resend cooldown and 5/hour email limit, with a fresh token every call", async () => {
  const s = system();
  await s.send();
  const early = await s.send();
  assert.equal(early.data.code, "RESEND_COOLDOWN");
  assert.equal(early.response.status, 429);
  assert.equal(Number(early.response.headers.get("Retry-After")), 60);
  assert.equal(s.state.mailjetCalls.length, 1);
  for (let i = 0; i < 3; i++) { s.advance(61); assert.equal((await s.send()).response.status, 200); }
  s.advance(61);
  assert.equal((await s.send()).data.code, "RATE_LIMITED");
  // Rejected requests count toward the 5/hour request quota, documented in README.
  assert.equal(s.state.mailjetCalls.length, 4);
});
test("simultaneous sends emit one email; atomic quotas cannot exceed 5", async () => {
  const s = system();
  const results = await Promise.all(Array.from({ length: 15 }, () => s.send()));
  assert.equal(results.filter(result => result.data.success).length, 1);
  assert.equal(s.state.mailjetCalls.length, 1);
  const row = s.env.AUTH_DB.sqlite.prepare("SELECT MAX(hits) AS n FROM email_auth_rate_limits").get();
  assert.equal(row.n, 15); // IP quota accounts for all requests.
  assert.equal(s.env.AUTH_DB.sqlite.prepare("SELECT COUNT(*) AS n FROM email_auth_rate_limits WHERE hits = 5").get().n, 1);
});
test("30/hour IP quota is enforced separately across different emails", async () => {
  const s = system();
  for (let i = 0; i < 30; i++) assert.equal((await s.send(`person${i}@example.com`)).response.status, 200);
  assert.equal((await s.send("person30@example.com")).response.status, 429);
  assert.equal(s.state.mailjetCalls.length, 30);
});
test("invalid, absent, expired and consumed codes have the same public failure", async () => {
  const s = system(); const sent = await s.send();
  const otp = latestOtp(s.state);
  const bad = otp === "000000" ? "000001" : "000000";
  const wrong = await s.verify("customer@example.com", bad, sent.data.challengeId);
  const absent = await s.verify("nobody@example.com", otp);
  assert.equal(wrong.data.code, absent.data.code);
  assert.equal(wrong.data.message, absent.data.message);
  s.advance(301);
  const expired = await s.verify("customer@example.com", otp, sent.data.challengeId);
  assert.equal(expired.data.message, wrong.data.message);
  assert.equal(count(s, "email_auth_sessions"), 0);
});
test("five attempts, including a correct fifth attempt, and no sixth attempt", async () => {
  const s = system(); const sent = await s.send(); const otp = latestOtp(s.state);
  const bad = otp === "000000" ? "000001" : "000000";
  for (let i = 0; i < 4; i++) assert.equal((await s.verify("customer@example.com", bad)).response.status, 400);
  assert.equal((await s.verify("customer@example.com", otp, sent.data.challengeId)).response.status, 200);
  assert.equal((await s.verify("customer@example.com", otp)).response.status, 400);
  const blocked = system(); await blocked.send(); const blockedOtp = latestOtp(blocked.state);
  for (let i = 0; i < 10; i++) await blocked.verify("customer@example.com", blockedOtp === "000000" ? "000001" : "000000");
  assert.equal(blocked.env.AUTH_DB.sqlite.prepare("SELECT attempts FROM email_otp_challenges").get().attempts, 5);
  assert.equal((await blocked.verify("customer@example.com", blockedOtp)).response.status, 400);
});
test("parallel correct verifications consume once and create only one session", async () => {
  const s = system(); const sent = await s.send(); const otp = latestOtp(s.state);
  const results = await Promise.all(Array.from({ length: 5 }, () => s.verify("customer@example.com", otp, sent.data.challengeId)));
  assert.equal(results.filter(result => result.data.success).length, 1);
  assert.equal(count(s, "email_auth_sessions"), 1);
});
test("logout cancels a verification even after consumption but before session insertion", async () => {
  const s = system(); const sent = await s.send(); const otp = latestOtp(s.state);
  const db = s.env.AUTH_DB;
  const realBatch = db.batch.bind(db);
  let release, entered;
  const gate = new Promise(resolve => { release = resolve; });
  const reached = new Promise(resolve => { entered = resolve; });
  db.batch = async statements => {
    if (statements.some(statement => statement.sql.includes("INSERT INTO email_auth_sessions"))) { entered(); await gate; }
    return realBatch(statements);
  };
  const verify = s.verify("customer@example.com", otp, sent.data.challengeId);
  await reached;
  await s.call("/api/logout", { challengeId: sent.data.challengeId });
  release();
  assert.equal((await verify).response.status, 400);
  assert.equal(count(s, "email_auth_sessions"), 0);
  assert.equal(count(s, "email_auth_users"), 0);
});
test("CORS/CSRF policy, preflight, method checks and existing route passthrough", async () => {
  const s = system();
  const denied = await s.call("/api/send-otp", { email: "a@example.com", turnstileToken: "test" }, { Origin: "https://attacker.example" });
  assert.equal(denied.response.status, 403);
  assert.equal(denied.response.headers.get("Access-Control-Allow-Origin"), null);
  const options = await handleEmailAuth(new Request("https://e-kyc.duitjom.my/api/send-otp", { method: "OPTIONS", headers: { Origin: "https://www.duitjom.my" } }), s.env);
  assert.equal(options.status, 204);
  assert.equal(options.headers.get("Access-Control-Allow-Credentials"), "true");
  assert.equal(options.headers.get("Access-Control-Allow-Origin"), "https://www.duitjom.my");
  assert.equal(await handleEmailAuth(new Request("https://e-kyc.duitjom.my/api/other"), s.env), null);
  assert.equal((await handleEmailAuth(new Request("https://e-kyc.duitjom.my/api/send-otp", { headers: { Origin: "https://www.duitjom.my" } }), s.env)).status, 405);
});
test("optional welcome queue only follows verification; it retries without breaking login", async () => {
  const s = system(); s.env.WELCOME_EMAIL_ENABLED = "true"; s.state.welcomeError = true;
  const sent = await s.send();
  assert.equal(count(s, "email_auth_outbox"), 0);
  const verified = await s.verify("customer@example.com", latestOtp(s.state), sent.data.challengeId);
  assert.equal(verified.data.success, true);
  await Promise.all(s.jobs);
  const row = () => s.env.AUTH_DB.sqlite.prepare("SELECT * FROM email_auth_outbox").get();
  assert.equal(row().status, "pending");
  assert.equal(row().attempts, 1);
  s.advance(121); await drainWelcomeEmails(s.env);
  s.advance(121); await drainWelcomeEmails(s.env);
  assert.equal(row().attempts, 3);
  assert.equal(row().status, "failed");
  assert.equal(count(s, "email_auth_sessions"), 1);
});
