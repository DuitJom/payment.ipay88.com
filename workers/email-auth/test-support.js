import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";

export class SqliteD1 {
  constructor() {
    this.sqlite = new DatabaseSync(":memory:");
    this.sqlite.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
  }
  withSession() { return this; }
  prepare(sql) {
    const database = this;
    return {
      sql, values: [],
      bind(...values) { this.values = values; return this; },
      async first() { return database.sqlite.prepare(sql).get(...this.values) || null; },
      async all() { return { results: database.sqlite.prepare(sql).all(...this.values) }; },
      runSync() {
        const result = database.sqlite.prepare(sql).run(...this.values);
        return { success: true, meta: { changes: Number(result.changes) } };
      },
      async run() { return this.runSync(); }
    };
  }
  async batch(statements) {
    this.sqlite.exec("BEGIN IMMEDIATE");
    try {
      const result = statements.map(statement => statement.runSync());
      this.sqlite.exec("COMMIT");
      return result;
    } catch (error) { this.sqlite.exec("ROLLBACK"); throw error; }
  }
}
let sequence = 0;
export function testEnvironment() {
  const id = ++sequence;
  return {
    AUTH_DB: new SqliteD1(),
    OTP_PEPPER: `test-only-pepper-${id}-${"p".repeat(48)}`,
    TURNSTILE_SECRET_KEY: `test-only-turnstile-secret-${id}`,
    MJ_APIKEY_PUBLIC: `test-only-mailjet-key-${id}`,
    MJ_APIKEY_PRIVATE: `test-only-mailjet-secret-${id}`,
    MAIL_FROM_EMAIL: "no-reply@duitjom.my",
    MAIL_FROM_NAME: "DuitJom",
    ALLOWED_ORIGINS: "https://www.duitjom.my,https://duitjom.my",
    TURNSTILE_ACTION: "auth",
    SESSION_TTL_SECONDS: "86400",
    WELCOME_EMAIL_ENABLED: "false"
  };
}
export function providerMock(state) {
  const usedTokens = new Set();
  return async (url, options) => {
    const body = JSON.parse(options.body);
    if (String(url).includes("/turnstile/")) {
      state.turnstileCalls.push(body);
      if (state.networkError) throw new Error("simulated network failure");
      const duplicate = usedTokens.has(body.response);
      usedTokens.add(body.response);
      return Response.json(state.turnstileResult || {
        success: !duplicate, hostname: "www.duitjom.my", action: "auth",
        "error-codes": duplicate ? ["timeout-or-duplicate"] : []
      });
    }
    if (String(url) !== "https://api.mailjet.com/v3.1/send") throw new Error("Unexpected upstream URL");
    state.mailjetCalls.push(body);
    const message = body.Messages[0];
    const error = state.mailjetError || (state.welcomeError && message.Subject.startsWith("Selamat"));
    if (error) return Response.json({ Messages: [{ Status: "error", Errors: [{ ErrorCode: "send-0002", ErrorIdentifier: "test-error" }] }] }, { status: state.mailjetStatus || 200 });
    return Response.json({ Messages: [{ Status: "success", To: [{ MessageUUID: `test-message-${state.mailjetCalls.length}`, MessageID: state.mailjetCalls.length }] }] });
  };
}
export function providerState() { return { turnstileCalls: [], mailjetCalls: [] }; }
export function latestOtp(state) {
  return state.mailjetCalls.filter(call => call.Messages[0].Subject.startsWith("Kod"))
    .at(-1)?.Messages[0].TextPart.match(/\b[0-9]{6}\b/)[0];
}
