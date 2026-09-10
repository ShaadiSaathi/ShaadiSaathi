# Shaadi Saathi Mobile (Expo)

React Native app for family + vendor portals. Uses the same Firebase project and Twilio OTP APIs as the Next.js web app.

## Setup

```bash
cd mobile
cp .env.example .env
# Fill EXPO_PUBLIC_* from the web app's NEXT_PUBLIC_FIREBASE_* values
# Set EXPO_PUBLIC_API_URL to your deployed Next.js origin (production or staging)
npm start
```

Then press `i` (iOS simulator), `a` (Android), or scan the QR with Expo Go.

## Auth

Mobile login uses `/api/auth/send-otp` + `/api/auth/verify-otp` (Twilio WhatsApp/SMS → Firebase custom token). No web reCAPTCHA required.

## What's included

- Family: home, guests, tasks (toggle done), vendors browse, settings
- Vendor: home stats, jobs list, profile
- Live Firestore subscriptions for wedding, guests, tasks, vendors, bookings

## Not yet ported

- Full onboarding wizards, Wedding AI, seating, payments UI, PDF export, collaborator management UI, messaging threads

Those stay on web for now; data written on web syncs into the mobile lists automatically.
