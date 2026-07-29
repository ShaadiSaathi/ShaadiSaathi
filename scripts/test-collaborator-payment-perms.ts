/**
 * Staging-only: verify owner vs collaborator financial permissions.
 * Run: npx tsx scripts/test-collaborator-payment-perms.ts
 *
 * Requires .env.local → shaadisaathistaging + sk_test Stripe keys.
 */
import { readFileSync } from "fs"
import { createRequire } from "module"

const require = createRequire(import.meta.url)

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/)
  if (!m) continue
  const k = m[1].trim()
  let v = m[2].trim()
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1)
  }
  if (!process.env[k]) process.env[k] = v
}

const sk = process.env.STRIPE_SECRET_KEY || ""
if (!sk.startsWith("sk_test")) {
  console.error("ABORT: STRIPE_SECRET_KEY must be sk_test (staging only)")
  process.exit(2)
}
if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== "shaadisaathistaging") {
  console.error("ABORT: NEXT_PUBLIC_FIREBASE_PROJECT_ID must be shaadisaathistaging")
  process.exit(2)
}

const { cert, getApps, initializeApp } = require("firebase-admin/app")
const { getAuth } = require("firebase-admin/auth")
const { getFirestore } = require("firebase-admin/firestore")
const { initializeApp: initClient } = require("firebase/app")
const {
  getAuth: getClientAuth,
  signInWithCustomToken,
} = require("firebase/auth")
const { getFirestore: getClientFs, doc, getDoc, updateDoc } = require("firebase/firestore")

const sa = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON!)
if (sa.project_id !== "shaadisaathistaging") {
  console.error("ABORT: admin SA not staging")
  process.exit(2)
}
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: sa.project_id,
      clientEmail: sa.client_email,
      privateKey: sa.private_key.replace(/\\n/g, "\n"),
    }),
    projectId: sa.project_id,
  })
}

const OWNER_UID = "perm-owner-staging"
const COLLAB_UID = "perm-collab-staging"
const WEDDING_ID = "staging-perm-wedding"
const BOOKING_ID = "staging-perm-booking"

async function main() {
  const adminDb = getFirestore()
  const adminAuth = getAuth()

  await adminDb.collection("weddings").doc(WEDDING_ID).set(
    {
      id: WEDDING_ID,
      name: "Permissions Test Wedding",
      couple: "Owner & Collab",
      shareCode: "PERMTEST",
      isPremium: true,
      inviteTheme: "classic",
      ownerId: OWNER_UID,
      memberUids: [OWNER_UID, COLLAB_UID],
      organiserName: "Person A Owner",
      organiserPhone: "+15550001001",
      firstEventDate: "2026-09-01",
      createdAt: Date.now(),
    },
    { merge: true }
  )

  await adminDb.collection("bookings").doc(BOOKING_ID).set(
    {
      id: BOOKING_ID,
      weddingId: WEDDING_ID,
      vendorId: "staging-vendor-perm",
      eventId: "mehndi",
      status: "confirmed",
      price: 100000,
      paymentPath: "in_person",
      familyName: "Person A Owner",
      weddingName: "Permissions Test Wedding",
      vendorName: "Staging Perm Vendor",
      createdAt: Date.now(),
      createdByUid: OWNER_UID,
      payment: {
        totalPrice: 100000,
        depositAmount: 27500,
        depositPercent: 0.275,
        balanceAmount: 72500,
        paymentPath: "in_person",
        depositStatus: "held",
        balanceStatus: "due_in_person",
        currency: "pkr",
        updatedAt: Date.now(),
      },
    },
    { merge: true }
  )

  const clientApp = initClient({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  })
  const clientAuth = getClientAuth(clientApp)
  const clientDb = getClientFs(clientApp)

  async function asUser<T>(uid: string, fn: () => Promise<T>): Promise<T> {
    const token = await adminAuth.createCustomToken(uid)
    await signInWithCustomToken(clientAuth, token)
    try {
      return await fn()
    } finally {
      await clientAuth.signOut()
    }
  }

  const results: Record<string, unknown> = {}

  results.collabPaymentWrite = await asUser(COLLAB_UID, async () => {
    try {
      await updateDoc(doc(clientDb, "bookings", BOOKING_ID), {
        "payment.depositStatus": "released",
        updatedAt: Date.now(),
      })
      return { ok: true, unexpected: "WRITE_ALLOWED" }
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string }
      return { ok: false, code: err.code, message: err.message }
    }
  })

  results.collabReadReceipt = await asUser(COLLAB_UID, async () => {
    try {
      await updateDoc(doc(clientDb, "bookings", BOOKING_ID), {
        lastReadByFamily: Date.now(),
      })
      return { ok: true }
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string }
      return { ok: false, code: err.code, message: err.message }
    }
  })

  results.collabReadBooking = await asUser(COLLAB_UID, async () => {
    const snap = await getDoc(doc(clientDb, "bookings", BOOKING_ID))
    return {
      ok: snap.exists(),
      depositStatus: snap.data()?.payment?.depositStatus,
    }
  })

  results.ownerPaymentWrite = await asUser(OWNER_UID, async () => {
    try {
      await updateDoc(doc(clientDb, "bookings", BOOKING_ID), {
        "payment.depositStatus": "released",
        updatedAt: Date.now(),
      })
      return { ok: true }
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string }
      return { ok: false, code: err.code, message: err.message }
    }
  })

  console.log(JSON.stringify(results, null, 2))

  const collabBlocked =
    (results.collabPaymentWrite as { ok: boolean }).ok === false &&
    (results.collabPaymentWrite as { code?: string }).code === "permission-denied"
  const collabCanRead =
    (results.collabReadBooking as { ok: boolean }).ok === true &&
    (results.collabReadReceipt as { ok: boolean }).ok === true
  const ownerCanWrite = (results.ownerPaymentWrite as { ok: boolean }).ok === true

  const pass = collabBlocked && collabCanRead && ownerCanWrite
  console.log(pass ? "PASS staging collaborator payment permissions" : "FAIL")
  process.exit(pass ? 0 : 1)
}

void main()
