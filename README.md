This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Preview on your phone (QR code)

To open Shaadi Saathi in your phone's **browser** (not Expo Go) while developing:

```bash
npm run preview
```

This will:

1. Start the Next.js dev server on your local network (`0.0.0.0`) so other devices on the same Wi‑Fi can reach it
2. Detect your computer's local IP (e.g. `192.168.1.42`)
3. Print a **QR code** in the terminal — scan it with your phone's **Camera** app to open the site in Safari/Chrome
4. Print the plain URL below the QR code if you prefer to type or copy it

**Requirements:** Your phone and computer must be on the **same Wi‑Fi network**.

**Not on the same Wi‑Fi?** Use the public tunnel fallback (slower, needs internet):

```bash
npm run preview:tunnel
```

This prints a second QR code with a temporary public URL via [localtunnel](https://github.com/localtunnel/localtunnel). The first visit may show a tunnel warning page — continue through it to load the app.

**Quick links after scanning:**

- Family dashboard: `http://<your-ip>:3000/dashboard`
- Vendor dashboard: `http://<your-ip>:3000/vendor/dashboard`

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
