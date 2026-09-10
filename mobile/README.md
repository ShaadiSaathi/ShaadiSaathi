# Shaadi Saathi Mobile (Expo)

React Native app for family + vendor portals. Uses the same Firebase projects and Twilio OTP APIs as the Next.js web app.

## Firebase apps (registered)

| Env | Project | Bundle / package |
|-----|---------|------------------|
| Production | `shaadi-saathi-dd3da` | `com.shaadisaathi.app` |
| Staging | `shaadisaathistaging` | `com.shaadisaathi.app` |

Native configs live in `firebase/production/` and `firebase/staging/` (`google-services.json`, `GoogleService-Info.plist`, `firebase-web.json`). `app.config.js` picks the folder from `EXPO_PUBLIC_APP_ENV`.

## Setup

```bash
cd mobile
cp .env.example .env
# Defaults: production Firebase JSON + production API URL from app.config.js
# For staging:
#   EXPO_PUBLIC_APP_ENV=staging
#   EXPO_PUBLIC_API_URL=<staging Vercel URL>
npm start
```

From repo root: `npm run mobile` / `mobile:ios` / `mobile:android`.

Press `i` (iOS), `a` (Android), or scan the QR with Expo Go.

## Auth

`/api/auth/send-otp` + `/api/auth/verify-otp` → Firebase custom token. No web reCAPTCHA.

## Included

**Family:** home, guests, tasks, bookings, events, vendors, notifications, settings  
**Vendor:** home, jobs, alerts, profile  

Live Firestore subscriptions mirror the web data model.

## Still on web

Wedding AI, seating charts, payments UI, PDF export, collaborator management, full messaging threads. Data written on web syncs into mobile lists automatically.
