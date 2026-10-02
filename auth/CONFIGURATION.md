# Email OTP authentication and Google sign-in

The active portal uses one email OTP form on `index.html` for both registration and login. Register links open `?auth=email&intent=register`; the existing `page/register.html` bookmark redirects to that same form. Registration does not create an email/password Firebase account or send Firebase verification emails. The former password-reset URL now provides a link back to email OTP login.

## Email flow

1. The customer enters an email and completes Turnstile.
2. The frontend posts `{ email, turnstileToken }` to `https://e-kyc.duitjom.my/api/send-otp`.
3. The Worker validates Turnstile, creates/stores the OTP and sends it through Mailjet. A successful response is `{ "success": true }`; failures use a non-2xx status or `{ "success": false, "message": "..." }`.
4. The frontend starts a 60-second resend countdown per email. Correcting the address can request a new code immediately; switching back to the earlier address retains its cooldown. Each resend needs a fresh Turnstile token. Server-side rate limits must also apply; the UI timer is not a security boundary.
5. The frontend posts `{ email, otp }` to `/api/verify-otp`. Only a successful verification response displays the account panel and Continue button.
6. Continue opens the existing customer-details page without navigating away from the verified form. This also works when browser storage is unavailable. The old `index.html?step=payment` route remains compatible with a valid remembered UI session.

Mailjet sends the email; it does not generate or validate the application's OTP or establish its authentication session. Mailjet API/Secret keys belong in Worker secrets and must never be added to HTML or frontend JavaScript. The frontend no longer calls `/api/magic-link` or `/api/welcome`.

## Backend requirements and verification limits

The Worker source and deployment are external to this repository and have not been changed. Its existing endpoint contract is reused; real email delivery and OTP verification still need to be confirmed against that deployment.

The Worker must enforce allowed origins/CORS, server-side Turnstile verification, per-email/IP resend and attempt limits, code expiry, single use, and rejection of invalid codes. Protected operations must validate a server-issued authentication session/token. The legacy `duitjom_session` entry is only remembered UI state and must not be treated as authorization. When localStorage is unavailable, a successful verification still enables Continue during that page visit, but the UI session cannot survive navigation/reload. No persistent customer profile or Firebase email account is created by this frontend.

If Cloudflare challenge HTML is returned on an API request, frontend `fetch()` cannot treat it as the JSON API response. Diagnose the API-specific Cloudflare rules while retaining API protections; do not remove Turnstile validation.

## Google

Google sign-in alone still uses the existing Firebase web configuration in `firebase-config.js`. Enable the Google provider and authorize `duitjom.my` and `www.duitjom.my` in Firebase. No email/password Firebase APIs are invoked by the active email flow. A restored, unverified Firebase user must not hide the OTP form or unlock Continue.

## Translation and navigation

BM, English and Chinese labels are in `i18n/translations.js`. OTP messages, request/verify buttons, resend countdown, welcome text and Continue follow the selected language, including when browser storage is unavailable. A missing translation retains the HTML label rather than showing the key. The visible welcome name is the email prefix. `goToPaymentPage()` checks the verified UI state before opening customer details.
