# Shaadi Saathi Mobile (Expo)

React Native app for family + vendor portals. Same Firebase projects and Twilio OTP APIs as the Next.js web app.

## Run on your phone

```bash
cd mobile
npm start
```

Scan the QR with **Expo Go** (same Wi‑Fi). Tunnel mode: press `s` in the Expo terminal.

## Env

`EXPO_PUBLIC_APP_ENV=production` (default) or `staging`. Firebase configs load from `firebase/<env>/`.

## Native features

**Family:** guests, tasks, events, schedule, vendors + book, bookings + chat, deposit/balance pay (Stripe WebView), Wedding AI, seating, invite themes, PDF export, Premium upgrade, collaborators, notifications

**Vendor:** requests, jobs + check-in/complete + chat, onboarding/KYC/portfolio upload, payout IBAN, Featured upgrade, alerts

## Still lighter than web

Google Sign-In (phone OTP only on mobile), rich invite public pages (share links still work), platform admin.
