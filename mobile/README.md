# Shaadi Saathi Mobile (Expo)

React Native app for family + vendor portals. Same Firebase projects and Twilio OTP APIs as the Next.js web app.

## Run on your phone

```bash
cd mobile
npm start
```

Scan the QR with **Expo Go** (same Wi‑Fi). Tunnel mode: press `s` in the Expo terminal.

## Env

`EXPO_PUBLIC_APP_ENV=production` (default) or `staging`. Firebase configs load from `firebase/<env>/`. Optional `EXPO_PUBLIC_API_URL` overrides the Next.js API origin.

## Native in the app

**Family:** home, guests (add + RSVP + invite share), tasks (add + toggle), bookings (confirm / counter / chat), vendor marketplace + book, events, schedule, notifications, collaborators invite, settings

**Vendor:** home, requests (accept / decline / counter), jobs (check-in / complete / chat), alerts, profile

## Opens in browser from the app

Wedding AI, seating planner, Premium upgrade, PDF export, Stripe/Safepay payment UI, full vendor KYC/portfolio editors

Those stay on web for now; data syncs live into the mobile lists.
