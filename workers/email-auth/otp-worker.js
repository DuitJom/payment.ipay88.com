// Dedicated email auth module. handleEmailAuth returns null for other routes.
const AUTH_ROUTES = new Set(["/api/send-otp", "/api/verify-otp", "/api/session", "/api/logout"]);
const COOKIE_NAME = "__Host-duitjom_session";
const OTP_TTL = 300;
const RESEND_SECONDS = 60;
const encoder = new TextEncoder();
const now = () => Math.floor(Date.now() / 1000);

class AuthError extends Error {
  constructor(code, status, message, retryAfter = 0) {
    super(message);
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}
function reject(code, status, message, retryAfter) {
  throw new AuthError(code, status, message, retryAfter);
}
function log(event, requestId, detail = {}) {
  // No OTPs, tokens, cookies, API credentials or raw email/IP addresses in logs.
  console.log(JSON.stringify({ component: "email-auth", event, requestId, ...detail }));
}
function database(env) {
  if (!env.AUTH_DB?.prepare) reject("CONFIG_REQUIRED", 503, "Perkhidmatan OTP belum dikonfigurasi.");
  return env.AUTH_DB.withSession ? env.AUTH_DB.withSession("first-primary") : env.AUTH_DB;
}
function secret(value, name, minimum = 1) {
  if (typeof value !== "string" || value.length < minimum) {
    reject("CONFIG_REQUIRED", 503, `Tetapan ${name} belum lengkap.`);
  }
  return value;
}
function pepper(env) { return secret(env.OTP_PEPPER, "OTP_PEPPER", 32); }
function emailAddress(value) {
  if (typeof value !== "string") reject("INVALID_EMAIL", 400, "Sila isi email yang sah.");
  const email = value.trim().toLowerCase();
  if (email.length > 254 || /[\u0000-\u001f\u007f]/.test(email) || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]{2,}$/.test(email)) {
    reject("INVALID_EMAIL", 400, "Sila isi email yang sah.");
  }
  return email;
}
function origins(env) {
  return (env.ALLOWED_ORIGINS || "https://www.duitjom.my,https://duitjom.my")
    .split(",").map(value => value.trim()).filter(Boolean);
}
function headers(origin, requestId) {
  const result = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store", "Vary": "Origin", "X-Request-ID": requestId
  });
  if (origin) {
    result.set("Access-Control-Allow-Origin", origin);
    result.set("Access-Control-Allow-Credentials", "true");
    result.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    result.set("Access-Control-Allow-Headers", "Content-Type");
  }
  return result;
}
function json(body, status, cors, extra = {}) {
  const responseHeaders = new Headers(cors);
  for (const [key, value] of Object.entries(extra)) responseHeaders.set(key, String(value));
  return Response.json(body, { status, headers: responseHeaders });
}
async function readBody(request) {
  if (!(request.headers.get("Content-Type") || "").toLowerCase().startsWith("application/json")) {
    reject("JSON_REQUIRED", 415, "Permintaan mestilah dalam format JSON.");
  }
  const reader = request.body?.getReader();
  const chunks = [];
  let size = 0;
  if (reader) {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 8192) { await reader.cancel(); reject("BODY_TOO_LARGE", 413, "Permintaan terlalu besar."); }
      chunks.push(value);
    }
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try {
    const data = JSON.parse(new TextDecoder().decode(bytes));
    if (!data || Array.isArray(data) || typeof data !== "object") throw new Error("object required");
    return data;
  } catch { reject("INVALID_JSON", 400, "Permintaan JSON tidak sah."); }
}
function hex(bytes) { return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join(""); }
function fromHex(value) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) return new Uint8Array(32);
  return Uint8Array.from(value.match(/../g), byte => Number.parseInt(byte, 16));
}
async function hmacKey(env) {
  return crypto.subtle.importKey("raw", encoder.encode(pepper(env)), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
async function mac(env, value) {
  return hex(await crypto.subtle.sign("HMAC", await hmacKey(env), encoder.encode(value)));
}
async function tokenHash(token) { return hex(await crypto.subtle.digest("SHA-256", encoder.encode(token))); }
function randomToken() { return hex(crypto.getRandomValues(new Uint8Array(32))); }
function sixDigitOTP() {
  const limit = Math.floor(0x100000000 / 1_000_000) * 1_000_000;
  const bytes = new Uint32Array(1);
  do { crypto.getRandomValues(bytes); } while (bytes[0] >= limit);
  return String(bytes[0] % 1_000_000).padStart(6, "0");
}
async function rateLimit(db, env, label, maximum) {
  const timestamp = now();
  const windowStart = Math.floor(timestamp / 3600) * 3600;
  const bucketKey = await mac(env, label);
  const row = await db.prepare(`INSERT INTO email_auth_rate_limits(bucket_key, window_start, hits)
    VALUES (?1, ?2, 1) ON CONFLICT(bucket_key, window_start) DO UPDATE SET hits = hits + 1
    WHERE hits < ?3 RETURNING hits`).bind(bucketKey, windowStart, maximum).first();
  if (!row) reject("RATE_LIMITED", 429, "Terlalu banyak permintaan. Sila cuba kemudian.", windowStart + 3600 - timestamp);
}
async function upstream(url, init, timeoutMs, requestId, service) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const data = await response.json();
    return { response, data };
  } catch {
    log("upstream-unavailable", requestId, { service });
    reject("UPSTREAM_UNAVAILABLE", 502, "Perkhidmatan tidak dapat dihubungi. Sila cuba lagi.");
  } finally { clearTimeout(timer); }
}
async function verifyTurnstile(request, env, data, origin, requestId) {
  const token = data.turnstileToken;
  if (typeof token !== "string" || !token || token.length > 2048) {
    reject("TURNSTILE_REQUIRED", 403, "Sila lengkapkan pengesahan keselamatan.");
  }
  const body = {
    secret: secret(env.TURNSTILE_SECRET_KEY || env.TURNSTILE_SECRET, "TURNSTILE_SECRET_KEY"),
    response: token, idempotency_key: requestId
  };
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) body.remoteip = ip;
  const { response, data: result } = await upstream("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
  }, 6000, requestId, "turnstile");
  const errorCodes = Array.isArray(result?.["error-codes"]) ? result["error-codes"] : [];
  if (!response.ok || result?.success !== true || result.hostname !== new URL(origin).hostname ||
      result.action !== (env.TURNSTILE_ACTION || "auth")) {
    log("turnstile-rejected", requestId, { upstreamStatus: response.status, errorCodes, hostname: result?.hostname, action: result?.action });
    if (errorCodes.some(code => code === "missing-input-secret" || code === "invalid-input-secret")) {
      reject("TURNSTILE_CONFIG", 503, "Tetapan pengesahan keselamatan belum lengkap.");
    }
    if (!response.ok) reject("UPSTREAM_UNAVAILABLE", 502, "Perkhidmatan pengesahan tidak tersedia.");
    reject("TURNSTILE_REJECTED", 403, "Pengesahan keselamatan gagal. Sila cuba semula.");
  }
}
function mailSettings(env) {
  let from;
  try { from = emailAddress(env.MAIL_FROM_EMAIL || env.MAILJET_FROM_EMAIL); }
  catch { reject("CONFIG_REQUIRED", 503, "Tetapan MAIL_FROM_EMAIL belum lengkap."); }
  return {
    apiKey: secret(env.MJ_APIKEY_PUBLIC || env.MAILJET_API_KEY, "MJ_APIKEY_PUBLIC"),
    apiSecret: secret(env.MJ_APIKEY_PRIVATE || env.MAILJET_SECRET_KEY, "MJ_APIKEY_PRIVATE"),
    from,
    name: env.MAIL_FROM_NAME || "DuitJom"
  };
}
// Server-only helper for other authorized transactional email flows.
export async function sendTransactionalEmail(env, email, content, requestId = crypto.randomUUID()) {
  const mail = mailSettings(env);
  const { response, data } = await upstream("https://api.mailjet.com/v3.1/send", {
    method: "POST", headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${btoa(`${mail.apiKey}:${mail.apiSecret}`)}`
    }, body: JSON.stringify({ SandboxMode: false, Messages: [{
      From: { Email: mail.from, Name: mail.name }, To: [{ Email: emailAddress(email) }],
      Subject: content.Subject, TextPart: content.TextPart, HTMLPart: content.HTMLPart, CustomID: requestId
    }] })
  }, 10000, requestId, "mailjet");
  const message = data?.Messages?.[0];
  const recipient = message?.To?.[0];
  const messageId = recipient?.MessageUUID || recipient?.MessageID;
  if (!response.ok || message?.Status !== "success" || !messageId) {
    log("mailjet-rejected", requestId, {
      upstreamStatus: response.status,
      errorCodes: message?.Errors?.map(error => error.ErrorCode),
      errorIdentifiers: message?.Errors?.map(error => error.ErrorIdentifier)
    });
    reject("MAILJET_REJECTED", 502, "Email belum berjaya dihantar. Sila cuba lagi.");
  }
  log("mailjet-accepted", requestId, { messageId: String(messageId) });
  return String(messageId);
}
function frame(title, body) {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#1f2937"><h2>${title}</h2>${body}<p style="font-size:12px;color:#64748b">Email ini dijana secara automatik oleh DuitJom. Sila jangan balas email ini.</p></div>`;
}
function escapeHTML(value) { return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character])); }
async function sendOtp(request, env, db, origin, requestId) {
  const data = await readBody(request);
  const email = emailAddress(data.email);
  pepper(env);
  mailSettings(env);
  await rateLimit(db, env, `send-ip:${request.headers.get("CF-Connecting-IP") || "unknown"}`, 30);
  await verifyTurnstile(request, env, data, origin, requestId);
  await rateLimit(db, env, `send-email:${email}`, 5);
  const otp = sixDigitOTP();
  const challengeId = crypto.randomUUID();
  const timestamp = now();
  const otpMac = await mac(env, `${challengeId}:${email}:${otp}`);
  const row = await db.prepare(`INSERT INTO email_otp_challenges
    (email, challenge_id, otp_mac, created_at, expires_at, attempts, consumed, delivery_status)
    VALUES (?1, ?2, ?3, ?4, ?5, 0, 0, 'pending') ON CONFLICT(email) DO UPDATE SET
    challenge_id = excluded.challenge_id, otp_mac = excluded.otp_mac, created_at = excluded.created_at,
    expires_at = excluded.expires_at, attempts = 0, consumed = 0, cancelled = 0, delivery_status = 'pending', mailjet_message_id = NULL
    WHERE delivery_status = 'failed' OR created_at <= ?6 RETURNING challenge_id`)
    .bind(email, challengeId, otpMac, timestamp, timestamp + OTP_TTL, timestamp - RESEND_SECONDS).first();
  if (!row) {
    const existing = await db.prepare("SELECT created_at FROM email_otp_challenges WHERE email = ?1").bind(email).first();
    reject("RESEND_COOLDOWN", 429, "Sila tunggu sebelum meminta OTP baharu.", Math.max(1, RESEND_SECONDS - (timestamp - existing.created_at)));
  }
  try {
    const messageId = await sendTransactionalEmail(env, email, {
      Subject: "Kod Pengesahan DuitJom Anda",
      TextPart: `Kod pengesahan anda ialah ${otp}. Kod ini sah selama 5 minit. Jangan kongsikan kod ini dengan sesiapa. Jika anda tidak meminta kod ini, abaikan email ini.`,
      HTMLPart: frame("Kod Pengesahan", `<p>Gunakan kod ini untuk meneruskan:</p><p style="font-size:32px;font-weight:bold;letter-spacing:6px;text-align:center">${otp}</p><p>Kod ini sah selama 5 minit. Jangan kongsikan kod ini dengan sesiapa.</p><p>Jika anda tidak meminta kod ini, abaikan email ini.</p>`)
    }, requestId);
    await db.prepare("UPDATE email_otp_challenges SET delivery_status = 'accepted', mailjet_message_id = ?1 WHERE challenge_id = ?2")
      .bind(messageId, challengeId).run();
  } catch (error) {
    await db.prepare("UPDATE email_otp_challenges SET delivery_status = 'failed', consumed = 1 WHERE challenge_id = ?1").bind(challengeId).run();
    throw error;
  }
  return { success: true, message: "Permintaan OTP diterima.", challengeId, delivery: "accepted", expiresIn: OTP_TTL, resendAfter: RESEND_SECONDS };
}
function sessionCookie(token, seconds) {
  return `${COOKIE_NAME}=${token}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${seconds}`;
}
function cookieToken(request) {
  const cookie = (request.headers.get("Cookie") || "").split(";").map(part => part.trim())
    .find(part => part.startsWith(`${COOKIE_NAME}=`));
  const value = cookie?.slice(COOKIE_NAME.length + 1);
  return /^[a-f0-9]{64}$/.test(value || "") ? value : null;
}
// Use this on protected routes in the existing Worker before processing customer data.
export async function requireEmailSession(request, env) {
  const token = cookieToken(request);
  if (!token) reject("SESSION_REQUIRED", 401, "Sila log masuk menggunakan OTP email.");
  const row = await database(env).prepare("SELECT email, expires_at FROM email_auth_sessions WHERE token_hash = ?1 AND expires_at > ?2")
    .bind(await tokenHash(token), now()).first();
  if (!row) reject("SESSION_REQUIRED", 401, "Sesi telah tamat. Sila log masuk semula.");
  return { email: row.email, expiresAt: row.expires_at * 1000 };
}
function invalidOtp() { reject("OTP_INVALID", 400, "Kod OTP salah atau tamat tempoh. Sila minta kod baharu jika perlu."); }
async function verifyOtp(request, env, db, context, requestId) {
  const data = await readBody(request);
  const email = emailAddress(data.email);
  const otp = data.otp;
  if (typeof otp !== "string" || !/^[0-9]{6}$/.test(otp)) invalidOtp();
  if (data.challengeId !== undefined && (typeof data.challengeId !== "string" || !/^[a-f0-9-]{36}$/.test(data.challengeId))) invalidOtp();
  pepper(env);
  await rateLimit(db, env, `verify-ip:${request.headers.get("CF-Connecting-IP") || "unknown"}`, 150);
  // Reserve one of five attempts in one statement; simultaneous requests cannot exceed it.
  const row = await db.prepare(`UPDATE email_otp_challenges SET attempts = attempts + 1
    WHERE email = ?1 AND delivery_status = 'accepted' AND consumed = 0 AND cancelled = 0 AND expires_at > ?2 AND attempts < 5
    AND (?3 IS NULL OR challenge_id = ?3) RETURNING challenge_id, otp_mac`).bind(email, now(), data.challengeId || null).first();
  const valid = await crypto.subtle.verify("HMAC", await hmacKey(env), fromHex(row?.otp_mac),
    encoder.encode(`${row?.challenge_id || "invalid"}:${email}:${otp}`));
  if (!row || !valid) invalidOtp();
  // Exactly one verification can consume this challenge, even with the same correct code in parallel.
  const consumed = await db.prepare(`UPDATE email_otp_challenges SET consumed = 1
    WHERE challenge_id = ?1 AND consumed = 0 AND cancelled = 0 AND expires_at > ?2 RETURNING email`)
    .bind(row.challenge_id, now()).first();
  if (!consumed) invalidOtp();
  const timestamp = now();
  const ttl = Math.min(604800, Math.max(300, Number.parseInt(env.SESSION_TTL_SECONDS || "86400", 10) || 86400));
  const token = randomToken();
  const liveChallenge = "EXISTS (SELECT 1 FROM email_otp_challenges WHERE challenge_id = ?1 AND consumed = 1 AND cancelled = 0)";
  const statements = [
    db.prepare(`INSERT OR IGNORE INTO email_auth_users(email, created_at) SELECT ?2, ?3 WHERE ${liveChallenge}`)
      .bind(row.challenge_id, email, timestamp),
    db.prepare(`INSERT INTO email_auth_sessions(challenge_id, token_hash, email, created_at, expires_at)
      SELECT ?1, ?2, ?3, ?4, ?5 WHERE ${liveChallenge}`)
      .bind(row.challenge_id, await tokenHash(token), email, timestamp, timestamp + ttl)
  ];
  if (env.WELCOME_EMAIL_ENABLED === "true") {
    statements.push(db.prepare(`INSERT OR IGNORE INTO email_auth_outbox(id, email, kind, next_attempt_at)
      SELECT ?2, ?3, 'welcome', ?4 WHERE ${liveChallenge}`)
      .bind(row.challenge_id, crypto.randomUUID(), email, timestamp));
  }
  const results = await db.batch(statements);
  if (results[1]?.meta?.changes !== 1) invalidOtp();
  if (env.WELCOME_EMAIL_ENABLED === "true") context?.waitUntil?.(drainWelcomeEmails(env));
  return { body: { success: true, message: "OTP sah.", user: { email }, expiresAt: (timestamp + ttl) * 1000 }, cookie: sessionCookie(token, ttl) };
}
export async function drainWelcomeEmails(env) {
  const db = database(env);
  await db.prepare("UPDATE email_auth_outbox SET status = 'failed' WHERE status = 'sending' AND attempts >= 3 AND locked_until <= ?1")
    .bind(now()).run();
  for (let index = 0; index < 20; index++) {
    const timestamp = now();
    const row = await db.prepare(`UPDATE email_auth_outbox SET status = 'sending', attempts = attempts + 1, locked_until = ?1
      WHERE id = (SELECT id FROM email_auth_outbox WHERE attempts < 3 AND next_attempt_at <= ?2
        AND (status = 'pending' OR (status = 'sending' AND locked_until <= ?2)) LIMIT 1) RETURNING *`)
      .bind(timestamp + 90, timestamp).first();
    if (!row) break;
    try {
      const name = escapeHTML(row.email.split("@")[0].slice(0, 64));
      const messageId = await sendTransactionalEmail(env, row.email, {
        Subject: "Selamat datang ke DuitJom!",
        TextPart: "Email anda telah disahkan. Anda boleh log masuk ke www.duitjom.my menggunakan OTP email.",
        HTMLPart: frame("Selamat datang ke DuitJom", `<p>Selamat datang, ${name}.</p><p>Email anda telah disahkan. Anda boleh log masuk menggunakan OTP email di <a href="https://www.duitjom.my/">www.duitjom.my</a>.</p>`)
      }, row.id);
      await db.prepare("UPDATE email_auth_outbox SET status = 'sent', mailjet_message_id = ?1 WHERE id = ?2 AND attempts = ?3")
        .bind(messageId, row.id, row.attempts).run();
    } catch {
      await db.prepare("UPDATE email_auth_outbox SET status = ?1, next_attempt_at = ?2 WHERE id = ?3 AND attempts = ?4")
        .bind(row.attempts >= 3 ? "failed" : "pending", timestamp + 120, row.id, row.attempts).run();
      log("welcome-retry", row.id, { attempt: row.attempts });
    }
  }
}
export async function cleanupEmailAuth(env) {
  const db = database(env);
  const timestamp = now();
  await db.batch([
    db.prepare("DELETE FROM email_otp_challenges WHERE expires_at < ?1").bind(timestamp - 86400),
    db.prepare("DELETE FROM email_auth_rate_limits WHERE window_start < ?1").bind(timestamp - 7200),
    db.prepare("DELETE FROM email_auth_sessions WHERE expires_at <= ?1").bind(timestamp)
  ]);
}
export async function handleEmailAuth(request, env, context) {
  const path = new URL(request.url).pathname;
  if (!AUTH_ROUTES.has(path)) return null;
  const requestId = crypto.randomUUID();
  const origin = request.headers.get("Origin");
  const allowedOrigin = origins(env).includes(origin) ? origin : null;
  const cors = headers(allowedOrigin, requestId);
  try {
    if (!allowedOrigin) reject("ORIGIN_REJECTED", 403, "Laman ini tidak dibenarkan menggunakan pengesahan email.");
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const expectedMethod = path === "/api/session" ? "GET" : "POST";
    if (request.method !== expectedMethod) reject("METHOD_NOT_ALLOWED", 405, "Kaedah permintaan tidak dibenarkan.");
    const db = database(env);
    if (path === "/api/send-otp") return json({ ...await sendOtp(request, env, db, origin, requestId), requestId }, 200, cors);
    if (path === "/api/verify-otp") {
      const result = await verifyOtp(request, env, db, context, requestId);
      return json({ ...result.body, requestId }, 200, cors, { "Set-Cookie": result.cookie });
    }
    if (path === "/api/session") {
      const session = await requireEmailSession(request, env);
      return json({ success: true, user: { email: session.email }, expiresAt: session.expiresAt, requestId }, 200, cors);
    }
    const token = cookieToken(request);
    const data = request.body ? await readBody(request) : {};
    if (typeof data.challengeId === "string" && /^[a-f0-9-]{36}$/.test(data.challengeId)) {
      // Cancels this browser's flow, including a verify response arriving after logout.
      await db.batch([
        db.prepare("UPDATE email_otp_challenges SET cancelled = 1, consumed = 1 WHERE challenge_id = ?1").bind(data.challengeId),
        db.prepare("DELETE FROM email_auth_sessions WHERE challenge_id = ?1").bind(data.challengeId)
      ]);
    }
    if (token) await db.prepare("DELETE FROM email_auth_sessions WHERE token_hash = ?1").bind(await tokenHash(token)).run();
    return json({ success: true, requestId }, 200, cors, { "Set-Cookie": sessionCookie("", 0) });
  } catch (error) {
    const code = error instanceof AuthError ? error.code : "INTERNAL_ERROR";
    log("request-failed", requestId, { code, path });
    return json({ success: false, code, message: error instanceof AuthError ? error.message : "Perkhidmatan OTP mengalami masalah. Sila cuba lagi.",
      requestId, ...(error.retryAfter ? { retryAfter: error.retryAfter } : {}) }, error.status || 500, cors,
    error.retryAfter ? { "Retry-After": error.retryAfter } : {});
  }
}
// Standalone entry. Integrate handleEmailAuth into the existing Worker to preserve its other APIs.
export default {
  async fetch(request, env, context) {
    return await handleEmailAuth(request, env, context) || Response.json({ success: false, message: "Endpoint tidak dijumpai." }, { status: 404 });
  },
  async scheduled(controller, env, context) {
    context.waitUntil(Promise.all([drainWelcomeEmails(env), cleanupEmailAuth(env)]));
  }
};
