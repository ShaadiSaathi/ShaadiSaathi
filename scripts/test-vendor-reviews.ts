/**
 * Staging: seed a past booking, leave a review as family via shared server helper,
 * confirm vendor profile aggregates + list query.
 * Run: npx tsx scripts/test-vendor-reviews.ts
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

if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== "shaadisaathistaging") {
  console.error("ABORT: NEXT_PUBLIC_FIREBASE_PROJECT_ID must be shaadisaathistaging")
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

const OWNER_UID = "review-family-staging"
const VENDOR_OWNER_UID = "review-vendor-owner-staging"
const STRANGER_UID = "review-stranger-staging"
const WEDDING_ID = "staging-review-wedding"
const VENDOR_ID = "staging-review-vendor"
const BOOKING_ID = "staging-review-booking"
const FUTURE_BOOKING_ID = "staging-review-booking-future"

async function main() {
  const db = getFirestore()
  const auth = getAuth()

  for (const uid of [OWNER_UID, VENDOR_OWNER_UID, STRANGER_UID]) {
    try {
      await auth.getUser(uid)
    } catch {
      await auth.createUser({ uid, displayName: uid })
    }
  }

  await db.collection("weddings").doc(WEDDING_ID).set(
    {
      id: WEDDING_ID,
      name: "Review Test Wedding",
      couple: "A & B",
      shareCode: "REVTEST",
      isPremium: true,
      inviteTheme: "classic",
      ownerId: OWNER_UID,
      memberUids: [OWNER_UID],
      organiserName: "Review Family",
      organiserPhone: "+15550001901",
      firstEventDate: "2026-01-10",
      createdAt: Date.now(),
    },
    { merge: true }
  )

  await db.collection("vendors").doc(VENDOR_ID).set(
    {
      id: VENDOR_ID,
      businessName: "Staging Review Vendor",
      categoryId: "photography",
      city: "Karachi",
      phone: "+15550001902",
      bio: "Staging vendor for review tests.",
      ownerUid: VENDOR_OWNER_UID,
      subscriptionTier: "basic",
      availableFor: ["mehndi", "baraat", "walima"],
      verificationStatus: "verified",
      onboardingStatus: "verified",
      completedJobsCount: 2,
      rating: 0,
      reviewCount: 0,
      createdAt: Date.now(),
    },
    { merge: true }
  )

  await db.collection("bookings").doc(BOOKING_ID).set(
    {
      id: BOOKING_ID,
      weddingId: WEDDING_ID,
      vendorId: VENDOR_ID,
      eventId: "mehndi",
      eventDate: "2026-01-10",
      status: "confirmed",
      price: 50000,
      paymentPath: "in_person",
      familyName: "Review Family",
      weddingName: "Review Test Wedding",
      vendorName: "Staging Review Vendor",
      createdAt: Date.now(),
      createdByUid: OWNER_UID,
    },
    { merge: true }
  )

  await db.collection("bookings").doc(FUTURE_BOOKING_ID).set(
    {
      id: FUTURE_BOOKING_ID,
      weddingId: WEDDING_ID,
      vendorId: VENDOR_ID,
      eventId: "baraat",
      eventDate: "2099-06-01",
      status: "confirmed",
      price: 60000,
      paymentPath: "in_person",
      familyName: "Review Family",
      weddingName: "Review Test Wedding",
      vendorName: "Staging Review Vendor",
      createdAt: Date.now(),
      createdByUid: OWNER_UID,
    },
    { merge: true }
  )

  await db.collection("vendor_reviews").doc(BOOKING_ID).delete().catch(() => {})
  await db.collection("vendors").doc(VENDOR_ID).update({
    rating: 0,
    reviewCount: 0,
  })

  const {
    upsertVendorReviewForMember,
    replyToVendorReviewAsOwner,
    VendorReviewError,
  } = await import("../lib/server/vendor-reviews")

  let futureBlocked = false
  try {
    await upsertVendorReviewForMember({
      uid: OWNER_UID,
      bookingId: FUTURE_BOOKING_ID,
      rating: 5,
    })
  } catch (e) {
    futureBlocked =
      e instanceof VendorReviewError && e.status === 400
  }

  let strangerBlocked = false
  try {
    await upsertVendorReviewForMember({
      uid: STRANGER_UID,
      bookingId: BOOKING_ID,
      rating: 5,
    })
  } catch (e) {
    strangerBlocked =
      e instanceof VendorReviewError && e.status === 403
  }

  const created = await upsertVendorReviewForMember({
    uid: OWNER_UID,
    bookingId: BOOKING_ID,
    rating: 5,
    comment: "Beautiful photos — staging test review.",
  })

  const replied = await replyToVendorReviewAsOwner({
    uid: VENDOR_OWNER_UID,
    bookingId: BOOKING_ID,
    reply: "Thank you for celebrating with us!",
  })

  const edited = await upsertVendorReviewForMember({
    uid: OWNER_UID,
    bookingId: BOOKING_ID,
    rating: 4,
    comment: "Updated staging review.",
  })

  let listedCount = 0
  let listedId: string | undefined
  try {
    const listed = await db
      .collection("vendor_reviews")
      .where("vendorId", "==", VENDOR_ID)
      .orderBy("createdAt", "desc")
      .get()
    listedCount = listed.size
    listedId = listed.docs[0]?.id
  } catch (err) {
    // Index may still be building — fall back to unordered filter.
    console.warn(
      "Indexed query unavailable (index building?); falling back:",
      err instanceof Error ? err.message : err
    )
    const listed = await db
      .collection("vendor_reviews")
      .where("vendorId", "==", VENDOR_ID)
      .get()
    listedCount = listed.size
    listedId = listed.docs[0]?.id
  }

  const vendorSnap = await db.collection("vendors").doc(VENDOR_ID).get()
  const vendorData = vendorSnap.data()!

  const results = {
    futureBlocked,
    strangerBlocked,
    createdRating: created.rating,
    editedRating: edited.rating,
    vendorReply: replied.vendorReply,
    replyPreservedOnEdit: edited.vendorReply,
    familyName: edited.familyName,
    vendorRating: vendorData.rating,
    vendorReviewCount: vendorData.reviewCount,
    listCount: listedCount,
    oneDocPerBooking: listedId === BOOKING_ID,
  }

  console.log(JSON.stringify(results, null, 2))

  const pass =
    futureBlocked &&
    strangerBlocked &&
    results.createdRating === 5 &&
    results.editedRating === 4 &&
    results.vendorRating === 4 &&
    results.vendorReviewCount === 1 &&
    results.listCount === 1 &&
    results.oneDocPerBooking &&
    Boolean(results.vendorReply) &&
    Boolean(results.replyPreservedOnEdit) &&
    results.familyName === "Review Family"

  console.log(pass ? "PASS staging vendor reviews" : "FAIL staging vendor reviews")
  process.exit(pass ? 0 : 1)
}

void main()
