/**
 * Staging-only: seed past-deadline dispute + past-grace no-show bookings,
 * run automation sweep, verify outcomes + automation_logs + notifications.
 *
 * Run: npx tsx scripts/test-booking-automation-staging.ts
 * Requires .env.local → shaadisaathistaging + FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON
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

const { cert, getApps, initializeApp } = require("firebase-admin/app")
const { getAuth } = require("firebase-admin/auth")
const { getFirestore } = require("firebase-admin/firestore")

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

const FAMILY_UID = "auto-family-staging"
const VENDOR_OWNER_UID = "auto-vendor-staging"
const WEDDING_ID = "auto-staging-wedding"
const VENDOR_ID = "auto-staging-vendor"
const DISPUTE_BOOKING_ID = "auto-staging-dispute-booking"
const NOSHOW_BOOKING_ID = "auto-staging-noshow-booking"

async function ensureUser(uid: string) {
  try {
    await auth.getUser(uid)
  } catch {
    await auth.createUser({ uid })
  }
}

async function seed() {
  await ensureUser(FAMILY_UID)
  await ensureUser(VENDOR_OWNER_UID)

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
      createdAt: Date.now(),
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
      noShowCount: 0,
      createdAt: Date.now(),
    },
    { merge: true }
  )

  const now = Date.now()
  const pastDeadline = now - 60 * 60 * 1000 // 1h ago

  await db.collection("bookings").doc(DISPUTE_BOOKING_ID).set({
    id: DISPUTE_BOOKING_ID,
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
      description: "Staging auto-resolve test dispute",
      familyReason: "Staging auto-resolve test dispute",
      submittedAt: pastDeadline - 48 * 60 * 60 * 1000,
      vendorResponseDeadlineAt: pastDeadline,
    },
    payment: {
      totalPrice: 90000,
      depositAmount: 25000,
      depositPercent: 0.275,
      balanceAmount: 65000,
      paymentPath: "in_person",
      depositStatus: "held",
      balanceStatus: "due_in_person",
      currency: "pkr",
      updatedAt: now,
    },
  })

  const pastGrace = now - 30 * 60 * 1000
  await db.collection("bookings").doc(NOSHOW_BOOKING_ID).set({
    id: NOSHOW_BOOKING_ID,
    weddingId: WEDDING_ID,
    vendorId: VENDOR_ID,
    eventId: "baraat",
    eventDate: "2026-06-02",
    status: "confirmed",
    price: 110000,
    paymentPath: "in_person",
    familyName: "Auto Family",
    weddingName: "Automation Test Wedding",
    vendorName: "Auto Test Caterer",
    createdAt: now - 5 * 24 * 60 * 60 * 1000,
    createdByUid: FAMILY_UID,
    payment: {
      totalPrice: 110000,
      depositAmount: 30000,
      depositPercent: 0.275,
      balanceAmount: 80000,
      paymentPath: "in_person",
      depositStatus: "held",
      balanceStatus: "due_in_person",
      currency: "pkr",
      scheduledArrivalAt: pastGrace - 2 * 60 * 60 * 1000,
      gracePeriodEndsAt: pastGrace,
      updatedAt: now,
    },
  })
}

async function main() {
  console.log("Seeding staging automation fixtures…")
  await seed()

  // Import after env is loaded so getAdminDb sees staging.
  const { runBookingAutomationSweep } = await import(
    "../lib/server/booking-automation"
  )

  console.log("Running automation sweep…")
  const result = await runBookingAutomationSweep({ source: "manual_trigger" })
  console.log("sweep", JSON.stringify(result, null, 2))

  const dispute = (
    await db.collection("bookings").doc(DISPUTE_BOOKING_ID).get()
  ).data()
  const noshow = (
    await db.collection("bookings").doc(NOSHOW_BOOKING_ID).get()
  ).data()

  const familyNotifs = await db
    .collection("notifications")
    .where("recipientUid", "==", FAMILY_UID)
    .limit(20)
    .get()
  const vendorNotifs = await db
    .collection("notifications")
    .where("recipientUid", "==", VENDOR_OWNER_UID)
    .limit(20)
    .get()

  const logs = await db
    .collection("automation_logs")
    .where("bookingId", "in", [DISPUTE_BOOKING_ID, NOSHOW_BOOKING_ID])
    .get()

  const checks = {
    disputeStatus: dispute?.status,
    disputeResolved: dispute?.dispute?.status,
    disputeResolution: dispute?.dispute?.resolution,
    disputeAuto: dispute?.dispute?.autoResolved === true,
    noshowStatus: noshow?.status,
    noshowAuto: noshow?.payment?.noShowAutoDeclared === true,
    familyHasDisputeNotif: familyNotifs.docs.some(
      (d: { data: () => { type?: string } }) =>
        d.data().type === "dispute_auto_resolved"
    ),
    familyHasNoshowNotif: familyNotifs.docs.some(
      (d: { data: () => { type?: string } }) => d.data().type === "no_show_declared"
    ),
    vendorHasDisputeNotif: vendorNotifs.docs.some(
      (d: { data: () => { type?: string } }) =>
        d.data().type === "dispute_auto_resolved"
    ),
    vendorHasNoshowNotif: vendorNotifs.docs.some(
      (d: { data: () => { type?: string } }) => d.data().type === "no_show_declared"
    ),
    logCount: logs.size,
    logActions: logs.docs.map((d: { data: () => { action?: string } }) => d.data().action),
    sweepResolved: result.resolvedDisputes,
    sweepNoshows: result.declaredNoShows,
  }

  console.log(JSON.stringify(checks, null, 2))

  const failed =
    checks.disputeStatus !== "completed" ||
    checks.disputeResolved !== "resolved" ||
    checks.disputeResolution !== "family" ||
    !checks.disputeAuto ||
    checks.noshowStatus !== "no_show" ||
    !checks.noshowAuto ||
    !checks.familyHasDisputeNotif ||
    !checks.familyHasNoshowNotif ||
    !checks.vendorHasDisputeNotif ||
    !checks.vendorHasNoshowNotif ||
    checks.logCount < 2 ||
    result.resolvedDisputes < 1 ||
    result.declaredNoShows < 1

  if (failed) {
    console.error("FAIL")
    process.exit(1)
  }
  console.log("PASS")
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
