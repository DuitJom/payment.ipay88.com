# Email OTP authentication and Google sign-in

The portal uses one email OTP form on `index.html` for registration and login. Register links open `?auth=email&intent=register`; `page/register.html` and the legacy `components/auth-login.html` redirect to the shared form. The old password-reset URL links back to OTP login. Email authentication does not create a Firebase email/password account or send Firebase verification emails.

## Required deployment order

Install the email auth module and additive D1 schema **before deploying this frontend**. Either integrate the handler into the existing `e-kyc.duitjom.my` Worker, or deploy a separate `duitjom-email-auth` Worker and assign its four auth Routes on that hostname as described in the Malay guide. Creating a new Worker without those Routes does not change the API used by the portal. The frontend now requires the challenge ID and server session endpoints; the former `{ success: true }`-only Worker contract is insufficient. The full existing Worker source/configuration was not provided, so unrelated backend APIs still need their own authorization review.

See [the Malay deployment and debugging guide](../workers/email-auth/README.md) for secrets, Turnstile/Mailjet checks, route integration and real inbox verification. `wrangler.example.toml` is a configuration example, not a production deployment: it has a placeholder database UUID and no production routes. Code and simulated tests do not establish real Mailjet delivery.

## Email flow and contract

1. The customer enters an email and completes Turnstile. The frontend posts `{ email, turnstileToken }` to `https://e-kyc.duitjom.my/api/send-otp` using `credentials: "include"`.
2. The Worker validates the token, hostname and action, enforces D1 limits, creates the OTP and calls Mailjet Send API v3.1 with sandbox disabled. It only returns success after a successful message result and tracking ID. The response includes `{ success: true, challengeId, delivery: "accepted", expiresIn: 300, resendAfter: 60 }`. API acceptance is not proof of inbox delivery.
3. The frontend starts a 60-second countdown per email. Each resend needs a fresh Turnstile token; server 429/retryAfter also extends the countdown. Server quotas and atomic cooldown enforce the limits independently of the UI.
4. The frontend posts `{ email, otp, challengeId }` to `/api/verify-otp`. Valid verification creates a server session and sets the `__Host-duitjom_session` cookie, with Secure, HttpOnly, SameSite=Lax and Path=/.
5. `GET /api/session` confirms that the browser accepted the cookie before displaying the account panel and Continue. It returns `{ success: true, user: { email }, expiresAt }`, with expiry in milliseconds. Continue checks the session again, then opens the existing customer-details form.
6. Reload/pageshow restores the cookie session through the Worker, even when localStorage is unavailable. The legacy `duitjom_session` item is display cache only; a forged cache entry cannot unlock email login. `?step=payment` waits for server/SDK session restoration.
7. `POST /api/logout` receives `{ challengeId }` when available and the cookie. It cancels the current challenge, revokes the session and expires the cookie. The frontend cancels outstanding requests and clears its state as well.

The Worker requires exact allowed origins and `Access-Control-Allow-Credentials: true`, handles OPTIONS before auth, and returns no-store responses. Production origins are `https://www.duitjom.my` and `https://duitjom.my`; the API is on the same HTTPS site. A Vercel preview is a different site and needs deliberately configured staging authentication to test real cookies/Turnstile. Cloudflare challenge HTML on an API fetch is surfaced as an API blocking error.

A rejected fetch with no readable response (network, DNS, TLS or CORS failure) shows the translated email-verification connection error. It cannot establish which of those causes occurred. A timeout keeps its separate message. The console warning records only the endpoint/method; it does not record email, OTP, cookies or Turnstile tokens. After a failed OTP send the form leaves its busy state and clears the security token, so a retry uses a fresh token.

Mailjet API/Secret keys and OTP_PEPPER remain server secrets. No frontend magic-link or welcome endpoint is invoked. An optional welcome email is queued by the Worker only after successful verification and can be retried by cron. The D1 profile is a verified email record, not a completed customer/E-KYC profile.

## Server authorization

Use the exported `requireEmailSession(request, env)` before processing protected customer operations, and use its verified email rather than an email/userId supplied in the request body. This module secures its four auth endpoints; integrating session authorization into unrelated existing Worker routes requires their source. Client Continue guards do not replace server authorization.

OTP attempts and consumption are conditional atomic D1 updates; the MAC binds the challenge ID, email and OTP using HMAC-SHA256 and a secret pepper. Invalid, expired, consumed and exhausted codes share one failure response. Request logs contain status/error codes and correlation IDs, not OTPs, cookies or raw customer email/IP addresses.

## Google

Google sign-in uses the existing Firebase web configuration in `firebase-config.js`. Enable the Google provider and authorize `duitjom.my` and `www.duitjom.my` in Firebase. No email/password Firebase APIs are invoked by this email flow. Only an actual restored, verified Firebase Google user can unlock Google Continue; an unverified email/password user or forged localStorage entry cannot do so. Google UI login remains usable if the email Worker is unavailable.

The email Worker cookie does not authenticate Google users. Protected APIs accepting Google must independently verify Firebase ID tokens on the server.

## Translation and validation

BM, English and Chinese OTP messages, request/verify labels, resend countdown, welcome text and Continue are in `i18n/translations.js`. Locale changes work even when storage is blocked. The visible welcome name is the email prefix. Legacy translation aliases resolve to the OTP request label rather than rendering a raw key.

Run `node --test workers/email-auth/otp-worker.test.js` and `node --experimental-vm-modules --test tests/auth-email-flow.test.cjs` with Node.js 24. These use actual application/Worker code and SQLite, with simulated browser/Firebase/Turnstile/Mailjet boundaries. Real sender verification, production secrets and inbox delivery still require the deployment checks in the guide.
