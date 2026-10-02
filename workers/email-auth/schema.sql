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
