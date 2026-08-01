/**
 * Staging: create a real Stripe test-mode PaymentIntent (succeeded),
 * attach it to a past-deadline dispute booking, run the automation sweep,
 * and assert a Stripe refund was created.
 *
 * Run: npx tsx scripts/test-automation-refund-staging.ts
 */
import { readFileSync } from "fs"
import { createRequire } from "module"

const require = createRequire(import.meta.url)

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/)
  if (!m) continue
  const k = m[1]!.trim()
  let v = m[2]!.trim()
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1)
  }
  if (!process.env[k]) process.env[k] = v
}

if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== "shaadisaathistaging") {
  console.error("ABORT: must point at shaadisaathistaging")
  process.exit(2)
}

const sk = process.env.STRIPE_SECRET_KEY?.trim() || ""
if (!sk.startsWith("sk_test_")) {
  console.error("ABORT: STRIPE_SECRET_KEY must be sk_test_ for this script")
  process.exit(2)
}

const { cert, getApps, initializeApp } = require("firebase-admin/app")
const { getAuth } = require("firebase-admin/auth")
const { getFirestore } = require("firebase-admin/firestore")
const Stripe = require("stripe")

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

const db = getFirestore()
const auth = getAuth()
const stripe = new Stripe(sk, { apiVersion: "2026-06-24.dahlia" })

const FAMILY_UID = "auto-family-staging"
const VENDOR_OWNER_UID = "auto-vendor-staging"
const WEDDING_ID = "auto-staging-wedding"
const VENDOR_ID = "auto-staging-vendor"
const BOOKING_ID = "auto-staging-refund-dispute"

async function ensureUser(uid: string) {
  try {
    await auth.getUser(uid)
  } catch {
    await auth.createUser({ uid })
  }
}

async function main() {
  await ensureUser(FAMILY_UID)
  await ensureUser(VENDOR_OWNER_UID)

  const now = Date.now()
  const pastDeadline = now - 60 * 60 * 1000
  const depositPkr = 25000
  // PKR is not zero-decimal — amount in paisa
  const amountPaisa = depositPkr * 100

  console.log("Creating Stripe test PaymentIntent…")
  const intent = await stripe.paymentIntents.create({
    amount: amountPaisa,
    currency: "pkr",
    payment_method: "pm_card_visa",
    confirm: true,
    automatic_payment_methods: { enabled: true, allow_redirects: "never" },
    metadata: {
      bookingId: BOOKING_ID,
      app: "shaadi-saathi",
      kind: "deposit",
      test: "automation_refund",
    },
  })

  if (intent.status !== "succeeded") {
    console.error("FAIL: PaymentIntent not succeeded:", intent.status, intent.id)
    process.exit(1)
  }
  console.log("PaymentIntent succeeded:", intent.id)

  await db.collection("weddings").doc(WEDDING_ID).set(
    {
      id: WEDDING_ID,
      name: "Automation Test Wedding",
      couple: "Auto & Mate",
      shareCode: "AUTO01",
      isPremium: false,
      inviteTheme: "classic",
      ownerId: FAMILY_UID,
      memberUids: [FAMILY_UID],
      organiserName: "Auto Family",
      organiserPhone: "+15550003001",
      firstEventDate: "2026-06-01",
      createdAt: now,
    },
    { merge: true }
  )
  await db.collection("vendors").doc(VENDOR_ID).set(
    {
      id: VENDOR_ID,
      businessName: "Auto Test Caterer",
      categoryId: "catering",
      city: "Lahore",
      phone: "+15550003002",
      ownerUid: VENDOR_OWNER_UID,
      subscriptionTier: "basic",
      availableFor: ["mehndi", "baraat", "walima"],
      emergencyAvailable: true,
      suspended: false,
      createdAt: now,
    },
    { merge: true }
  )

  await db.collection("bookings").doc(BOOKING_ID).set({
    id: BOOKING_ID,
    weddingId: WEDDING_ID,
    vendorId: VENDOR_ID,
    eventId: "mehndi",
    eventDate: "2026-06-01",
    status: "disputed",
    price: 90000,
    paymentPath: "in_person",
    familyName: "Auto Family",
    weddingName: "Automation Test Wedding",
    vendorName: "Auto Test Caterer",
    createdAt: now - 3 * 24 * 60 * 60 * 1000,
    createdByUid: FAMILY_UID,
    dispute: {
      status: "under_review",
      category: "quality",
      description: "Refund automation test dispute",
      familyReason: "Refund automation test dispute",
      submittedAt: pastDeadline - 48 * 60 * 60 * 1000,
      vendorResponseDeadlineAt: pastDeadline,
    },
    payment: {
      totalPrice: 90000,
      depositAmount: depositPkr,
      depositPercent: 0.275,
      balanceAmount: 65000,
      paymentPath: "in_person",
      depositStatus: "held",
      balanceStatus: "due_in_person",
      currency: "pkr",
      stripeDepositPaymentIntentId: intent.id,
      updatedAt: now,
    },
  })

  const { runBookingAutomationSweep } = await import(
    "../lib/server/booking-automation"
  )
  console.log("Running automation sweep…")
  const result = await runBookingAutomationSweep({ source: "manual_trigger" })
  console.log("sweep", JSON.stringify(result, null, 2))

  const booking = (await db.collection("bookings").doc(BOOKING_ID).get()).data()
  const refreshed = await stripe.paymentIntents.retrieve(intent.id, {
    expand: ["latest_charge"],
  })
  const refunds = await stripe.refunds.list({ payment_intent: intent.id, limit: 5 })

  const logs = await db
    .collection("automation_logs")
    .where("bookingId", "==", BOOKING_ID)
    .get()
  const recent = logs.docs
    .map((d: { id: string; data: () => Record<string, unknown> }) => ({
      id: d.id,
      ...d.data(),
    }))
    .filter((l: { createdAt?: number }) => (l.createdAt ?? 0) >= now)
    .map((l: { action?: string }) => l.action)

  const checks = {
    disputeAuto: booking?.dispute?.autoResolved === true,
    disputeResolution: booking?.dispute?.resolution,
    depositStatus: booking?.payment?.depositStatus,
    sweepRefundsAttempted: result.refundsAttempted,
    sweepRefundsSucceeded: result.refundsSucceeded,
    piStatus: refreshed.status,
    refundCount: refunds.data.length,
    refundStatus: refunds.data[0]?.status ?? null,
    refundAmount: refunds.data[0]?.amount ?? null,
    logActions: recent,
  }
  console.log("CHECKS", JSON.stringify(checks, null, 2))

  const failed =
    !checks.disputeAuto ||
    checks.disputeResolution !== "family" ||
    checks.depositStatus !== "refunded" ||
    result.refundsSucceeded < 1 ||
    refunds.data.length < 1 ||
    (refunds.data[0]?.status !== "succeeded" &&
      refunds.data[0]?.status !== "pending") ||
    !recent.includes("refund_attempted") ||
    !recent.includes("dispute_auto_resolved")

  console.log(failed ? "FAIL" : "PASS")
  process.exit(failed ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
