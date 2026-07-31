/**
 * Staging-only: platform-wide vendor date conflict prevention.
 * Run: npx tsx scripts/test-vendor-date-conflicts.ts
 *
 * Requires .env.local → shaadisaathistaging
 */
import { readFileSync } from "fs"
import { createRequire } from "module"
import type { Transaction } from "firebase-admin/firestore"

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
  console.error("ABORT: NEXT_PUBLIC_FIREBASE_PROJECT_ID must be shaadisaathistaging")
  process.exit(2)
}

const { cert, getApps, initializeApp } = require("firebase-admin/app")
const { getFirestore } = require("firebase-admin/firestore")

const sa = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON || "{}")
if (sa.project_id !== "shaadisaathistaging") {
  console.error(`ABORT: admin project is ${sa.project_id}, expected shaadisaathistaging`)
  process.exit(2)
}

if (!getApps().length) {
  initializeApp({ credential: cert(sa), projectId: "shaadisaathistaging" })
}
const db = getFirestore()

const VENDOR_ID = "staging-conflict-vendor"
const DATE = "2026-11-15"
const OPEN_DATE = "2026-11-22"
const WEDDING_A = "staging-conflict-wedding-a"
const WEDDING_B = "staging-conflict-wedding-b"
const OWNER_A = "staging-conflict-owner-a"
const OWNER_B = "staging-conflict-owner-b"
const BOOKING_A = "staging-conflict-booking-a"
const LOCK_ID = `${VENDOR_ID}_${DATE}`

async function seed() {
  await db.collection("vendors").doc(VENDOR_ID).set(
    {
      id: VENDOR_ID,
      businessName: "Conflict Test Caterer",
      ownerUid: "staging-conflict-vendor-owner",
      availableFor: ["mehndi", "baraat", "walima"],
      categoryId: "catering",
      city: "Lahore",
      updatedAt: Date.now(),
    },
    { merge: true }
  )

  for (const [id, ownerId, name] of [
    [WEDDING_A, OWNER_A, "Family A Conflict Wedding"],
    [WEDDING_B, OWNER_B, "Family B Conflict Wedding"],
  ] as const) {
    await db.collection("weddings").doc(id).set(
      {
        id,
        name,
        couple: name,
        ownerId,
        memberUids: [ownerId],
        organiserName: name,
        organiserPhone: "+15550009901",
        firstEventDate: DATE,
        eventOverrides: {
          mehndi: { date: DATE },
          baraat: { date: OPEN_DATE },
          walima: { date: "2026-11-29" },
        },
        shareCode: id.slice(-8).toUpperCase(),
        inviteTheme: "classic",
        isPremium: true,
        createdAt: Date.now(),
      },
      { merge: true }
    )
  }

  await db.collection("bookings").doc(BOOKING_A).set({
    id: BOOKING_A,
    weddingId: WEDDING_A,
    vendorId: VENDOR_ID,
    eventId: "mehndi",
    eventDate: DATE,
    status: "confirmed",
    price: 100000,
    paymentPath: "in_person",
    familyName: "Family A",
    weddingName: "Family A Conflict Wedding",
    vendorName: "Conflict Test Caterer",
    createdAt: Date.now(),
    createdByUid: OWNER_A,
  })
  await db.collection("vendor_date_locks").doc(LOCK_ID).set({
    vendorId: VENDOR_ID,
    eventDate: DATE,
    bookingId: BOOKING_A,
    weddingId: WEDDING_A,
    status: "confirmed",
    createdAt: Date.now(),
  })

  // Clear prior open-date artifacts so the script is idempotent
  const openLockId = `${VENDOR_ID}_${OPEN_DATE}`
  await db.collection("vendor_date_locks").doc(openLockId).delete().catch(() => undefined)
  await db.collection("bookings").doc("staging-conflict-booking-b-open").delete().catch(() => undefined)
}

async function main() {
  const {
    assertVendorDateOpen,
    VendorAvailabilityError,
    claimVendorDateLockInTransaction,
  } = await import("../lib/server/vendor-availability")

  await seed()

  let blocked = false
  try {
    await assertVendorDateOpen({
      vendorId: VENDOR_ID,
      eventDate: DATE,
      weddingId: WEDDING_B,
    })
  } catch (e) {
    if (e instanceof VendorAvailabilityError && e.code === "DATE_CONFLICT") {
      blocked = true
      console.log("PASS: Family B blocked on conflict date:", e.message)
    } else {
      throw e
    }
  }
  if (!blocked) {
    console.error("FAIL: Family B was not blocked on confirmed conflict date")
    process.exit(1)
  }

  await assertVendorDateOpen({
    vendorId: VENDOR_ID,
    eventDate: OPEN_DATE,
    weddingId: WEDDING_B,
  })
  console.log("PASS: Family B can book open date", OPEN_DATE)

  const openBookingId = "staging-conflict-booking-b-open"
  await db.runTransaction(async (tx: Transaction) => {
    await claimVendorDateLockInTransaction(tx, {
      vendorId: VENDOR_ID,
      eventDate: OPEN_DATE,
      weddingId: WEDDING_B,
      bookingId: openBookingId,
    })
    tx.set(db.collection("bookings").doc(openBookingId), {
      id: openBookingId,
      weddingId: WEDDING_B,
      vendorId: VENDOR_ID,
      eventId: "baraat",
      eventDate: OPEN_DATE,
      status: "confirmed",
      price: 120000,
      paymentPath: "in_person",
      familyName: "Family B",
      weddingName: "Family B Conflict Wedding",
      vendorName: "Conflict Test Caterer",
      createdAt: Date.now(),
      createdByUid: OWNER_B,
    })
  })
  console.log("PASS: Family B claimed open date via transaction")

  let txnBlocked = false
  try {
    await db.runTransaction(async (tx: Transaction) => {
      await claimVendorDateLockInTransaction(tx, {
        vendorId: VENDOR_ID,
        eventDate: DATE,
        weddingId: WEDDING_B,
        bookingId: "staging-conflict-booking-b-bad",
      })
    })
  } catch (e) {
    if (e instanceof VendorAvailabilityError && e.code === "DATE_CONFLICT") {
      txnBlocked = true
      console.log("PASS: transaction claim rejected for conflict date")
    } else {
      throw e
    }
  }
  if (!txnBlocked) {
    console.error("FAIL: transaction claim should have been rejected")
    process.exit(1)
  }

  await db.runTransaction(async (tx: Transaction) => {
    await claimVendorDateLockInTransaction(tx, {
      vendorId: VENDOR_ID,
      eventDate: DATE,
      weddingId: WEDDING_A,
      bookingId: BOOKING_A,
    })
  })
  console.log("PASS: Family A can re-claim own lock")

  console.log("PASS staging vendor date conflicts")
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
