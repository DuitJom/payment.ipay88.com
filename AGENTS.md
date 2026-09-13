# Base44 Dev Environment

## What this project is
DuitJom — a static HTML/CSS/JS payment portal site. The main content is `index.html` at the repo root, which loads partial HTML components via `fetch()` (e.g. `features.html`, `components/*.html`), uses Firebase client-side (CDN ES module imports in `firebase-config.js`), Tailwind (CDN), Cloudflare Turnstile, and Sentry. All client-side; no backend server required.

The `app/` directory, `package.json`, `next.config.mjs`, and `proxy.ts` are a minimal separate Next.js + Clerk demo — **not** the main content. They are not used by the Base44 dev setup.

## How it runs here
- **`docker-compose.base44.yml`** — single `web` service using `node:22-slim`, source bind-mounted at `/app`, running Vite as a static dev server with live reload on port 3000.
- Vite is installed globally (`npm install -g vite`) to avoid pulling the project's Next.js/Clerk dependencies.
- `vite.config.mjs` sets `host: 0.0.0.0`, `port: 3000`, `allowedHosts: true`.
- No external secrets required — Firebase web config is hardcoded (public), Turnstile sitekey is in HTML data attributes.

## Verification
- `curl http://localhost:3000/` returns 200 with the DuitJom HTML.
- Static assets (CSS, JS, images), partials (`features.html`, `components/*.html`), and subpages (`page/*.html`) all return 200.
- Vite injects its HMR client for live reload on file changes.

## Known warnings
- Vite logs a dependency pre-bundling skip for `firebase-config.js` (imported by `components/auth-login.html` with a relative path). This is cosmetic — it does not affect serving.
