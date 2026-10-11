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
