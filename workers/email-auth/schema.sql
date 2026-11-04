-- Additive: the existing auth_challenges table and other Worker data are untouched.
CREATE TABLE IF NOT EXISTS email_otp_challenges (
  email TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL UNIQUE,
  otp_mac TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  consumed INTEGER NOT NULL DEFAULT 0 CHECK (consumed IN (0, 1)),
  cancelled INTEGER NOT NULL DEFAULT 0 CHECK (cancelled IN (0, 1)),
  delivery_status TEXT NOT NULL CHECK (delivery_status IN ('pending', 'accepted', 'failed')),
  mailjet_message_id TEXT
);
CREATE TABLE IF NOT EXISTS email_auth_rate_limits (
  bucket_key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  hits INTEGER NOT NULL,
  PRIMARY KEY (bucket_key, window_start)
);
CREATE TABLE IF NOT EXISTS email_auth_users (
  email TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS email_auth_sessions (
  token_hash TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL,
  email TEXT NOT NULL REFERENCES email_auth_users(email),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS email_auth_sessions_expiry ON email_auth_sessions(expires_at);
CREATE INDEX IF NOT EXISTS email_auth_sessions_challenge ON email_auth_sessions(challenge_id);
CREATE INDEX IF NOT EXISTS email_otp_challenges_expiry ON email_otp_challenges(expires_at);
CREATE INDEX IF NOT EXISTS email_auth_rate_limits_window ON email_auth_rate_limits(window_start);
CREATE TABLE IF NOT EXISTS email_auth_outbox (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL REFERENCES email_auth_users(email),
  kind TEXT NOT NULL CHECK (kind = 'welcome'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL,
  locked_until INTEGER NOT NULL DEFAULT 0,
  mailjet_message_id TEXT,
  UNIQUE(email, kind)
);

-- Apply before deploying the updated Worker. Safe to run more than once.
CREATE TABLE IF NOT EXISTS email_auth_pending_profiles (
  challenge_id TEXT PRIMARY KEY,
  intent TEXT NOT NULL CHECK(intent IN ('login', 'register', 'legacy')),
  kind TEXT NOT NULL CHECK(kind IN ('otp', 'link')),
  full_name TEXT,
  mykad TEXT,
  phone TEXT
);
CREATE TABLE IF NOT EXISTS email_auth_profiles (
  email TEXT PRIMARY KEY REFERENCES email_auth_users(email),
  full_name TEXT NOT NULL,
  mykad TEXT NOT NULL,
  phone TEXT NOT NULL
);

-- Activity history. Timestamps are Unix seconds (UTC).
-- Run this schema BEFORE deploying the updated Worker.
CREATE TABLE IF NOT EXISTS email_auth_events (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK(event_type IN ('otp_requested','magic_link_requested','sign_in','sign_up')),
  method TEXT NOT NULL CHECK(method IN ('email_otp','magic_link')),
  intent TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  notification_status TEXT NOT NULL CHECK(notification_status IN ('skipped','pending','sending','sent','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0,
  mailjet_message_id TEXT
);
CREATE INDEX IF NOT EXISTS email_auth_events_customer_time ON email_auth_events(email, created_at DESC);
CREATE INDEX IF NOT EXISTS email_auth_events_notifications ON email_auth_events(notification_status, next_attempt_at);
CREATE VIEW IF NOT EXISTS email_auth_activity_malaysia AS
SELECT id, email, event_type, method, intent,
       datetime(created_at, 'unixepoch') AS time_utc,
       datetime(created_at, 'unixepoch', '+8 hours') AS time_malaysia,
       notification_status, attempts
FROM email_auth_events;
