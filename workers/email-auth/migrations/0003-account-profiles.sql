CREATE TABLE IF NOT EXISTS email_auth_events (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'otp_requested',
      'magic_link_requested',
      'sign_in',
      'sign_up'
    )
  ),
  method TEXT NOT NULL CHECK (
    method IN ('email_otp', 'magic_link')
  ),
  intent TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  notification_status TEXT NOT NULL CHECK (
    notification_status IN (
      'skipped',
      'pending',
      'sending',
      'sent',
      'failed'
    )
  ),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0,
  mailjet_message_id TEXT
);

CREATE INDEX IF NOT EXISTS email_auth_events_customer_time
ON email_auth_events(email, created_at DESC);

CREATE INDEX IF NOT EXISTS email_auth_events_notifications
ON email_auth_events(notification_status, next_attempt_at);

CREATE VIEW IF NOT EXISTS email_auth_activity_malaysia AS
SELECT
  id,
  email,
  event_type,
  method,
  intent,
  datetime(created_at, 'unixepoch') AS time_utc,
  datetime(created_at, 'unixepoch', '+8 hours') AS time_malaysia,
  notification_status,
  attempts
FROM email_auth_events;
