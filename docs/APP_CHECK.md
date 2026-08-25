# Firebase App Check setup (Shaadi Saathi)

App Check protects custom API routes and (later) Firestore from non-genuine clients.
This repo ships client + server support; **Console registration and enforcement toggles are manual**.

## Current rollout policy

| Environment | `APP_CHECK_MODE` | Firestore enforcement |
|-------------|------------------|------------------------|
| Staging Preview | `monitor` (after site key is set) | **Monitor only** in Console — do not enforce yet |
| Production | `off` until staging metrics look healthy | Leave **unenforced** until staging is green |

Modes:
- `off` — no server checks (default)
- `monitor` — verify/log App Check tokens; never reject API requests
- `enforce` — reject requests without a valid `X-Firebase-AppCheck` header

Auth ID tokens are always required on sensitive routes. App Check is **in addition to** Auth.

## 1. Pick attestation provider (web)

Prefer whatever is already available in Google Cloud for the project:

1. Open [Google Cloud Console → reCAPTCHA](https://console.cloud.google.com/security/recaptcha) for:
   - Staging: `shaadisaathistaging`
   - Production: `shaadi-saathi-dd3da`
2. If **reCAPTCHA Enterprise** keys already exist for your domains, use Enterprise.
3. Otherwise create a **reCAPTCHA v3** site key (score-based) for:
   - Staging: `shaadi-saathi-git-staging-altafemaad2009-2751s-projects.vercel.app` (+ `localhost` for local)
   - Production: `shaadi-saathi-kappa.vercel.app` (+ custom domain if any)

## 2. Register App Check in Firebase Console

For **each** project (staging first):

1. Firebase Console → **App Check**
2. Select the web app:
   - Staging: `shaadi-saathi-staging-web` (`1:175116701980:web:8ee8fb3362f661b35eaad9`)
   - Production: `shaadi-saathi-web` (`1:687688450120:web:e87f99d49437690d31587d`)
3. Register provider: **reCAPTCHA v3** or **reCAPTCHA Enterprise** (match step 1)
4. Paste the site key
5. Under **APIs** / product list for Firestore: set **Monitor** (not Enforce)
6. Do **not** enforce Firestore until metrics show legitimate traffic is attested

## 3. Environment variables

### Client (Preview staging / Production as appropriate)

```bash
# Public site key from reCAPTCHA / App Check registration
NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY=...

# Optional — only if using Enterprise instead of v3
# NEXT_PUBLIC_FIREBASE_APP_CHECK_PROVIDER=recaptcha-enterprise

# Local / CI debug (register token in Console → App Check → Manage debug tokens)
# NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN=<uuid>
```

### Server

```bash
# Staging Preview: start here
APP_CHECK_MODE=monitor

# After metrics look good for several days:
# APP_CHECK_MODE=enforce
```

Add via Vercel:

```bash
vercel env add NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY preview staging
vercel env add APP_CHECK_MODE preview staging
# value: monitor
```

Redeploy staging after adding vars (env changes do not hot-apply to existing deployments).

## 4. What the code does

- `AppCheckBootstrap` initializes App Check before Auth/Firestore work in the client tree
- `authenticatedFetch` attaches `Authorization` + `X-Firebase-AppCheck`
- `verifyPaymentUser` / `verifyAdminRequest` call `assertAppCheck` alongside ID token verification
- Covered routes include wedding-chat, payments, bookings, reviews, collaborators, vendor portfolio, admin APIs that use those helpers
- **Excluded:** Stripe webhooks, cron/automation secrets, public invite RSVP GETs

## 5. Tests

Firestore-direct scripts (guest tokens, vendor conflicts, notifications, reviews) do **not** need App Check tokens while Firestore is in monitor mode.

API scripts that hit `/api/*` under `APP_CHECK_MODE=enforce` should use:

```ts
import { apiAuthHeaders } from "./lib/api-auth-headers"
const headers = await apiAuthHeaders(idToken)
```

Admin SDK `createToken(appId)` mints valid App Check JWTs for CI.

## 6. When is enforce safe?

Only after Firebase Console App Check metrics for staging show:

- High % of requests with valid tokens from your web app
- Low unexplained “invalid / missing” from real users (not bots)

Then:
1. Set staging `APP_CHECK_MODE=enforce` and verify signup / chat / bookings / payments E2E
2. Flip Firestore from Monitor → Enforce on staging
3. Repeat for production (site key + `monitor` first, then enforce)

## 7. Local development

Without a site key, App Check simply does not initialize (APIs stay on `APP_CHECK_MODE=off` or `monitor` without rejecting).

With a site key + debug token registered in Console, set `NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN` so localhost attestation succeeds.
