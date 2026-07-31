/**
 * Staging E2E for in-app notifications (rules + create + scope).
 * Run: npx tsx scripts/test-notifications-staging.ts
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
const {
  getFirestore: getClientFs,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} = require("firebase/firestore")

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

const FAMILY_UID = "notif-family-staging"
const VENDOR_OWNER_UID = "notif-vendor-staging"
const UNRELATED_UID = "notif-unrelated-staging"
const WEDDING_ID = "notif-staging-wedding"
const VENDOR_ID = "notif-staging-vendor"
const BOOKING_ID = "notif-staging-booking"

const clientApp = initClient({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
})
const clientAuth = getClientAuth(clientApp)
const clientDb = getClientFs(clientApp)
const adminDb = getFirestore()
const adminAuth = getAuth()

async function ensureAuthUser(uid: string) {
  try {
    await adminAuth.getUser(uid)
  } catch {
    await adminAuth.createUser({ uid })
  }
}

async function asUser<T>(uid: string, fn: () => Promise<T>): Promise<T> {
  const token = await adminAuth.createCustomToken(uid)
  await signInWithCustomToken(clientAuth, token)
  try {
    return await fn()
  } finally {
    await clientAuth.signOut()
  }
}

async function seed() {
  await ensureAuthUser(FAMILY_UID)
  await ensureAuthUser(VENDOR_OWNER_UID)
  await ensureAuthUser(UNRELATED_UID)

  await adminDb.collection("weddings").doc(WEDDING_ID).set(
    {
      id: WEDDING_ID,
      name: "Notif Test Wedding",
      couple: "Family & Vendor",
      shareCode: "NOTIF01",
      isPremium: false,
      inviteTheme: "classic",
      ownerId: FAMILY_UID,
      memberUids: [FAMILY_UID],
      organiserName: "Notif Family",
      organiserPhone: "+15550002001",
      firstEventDate: "2026-12-01",
      createdAt: Date.now(),
    },
    { merge: true }
  )

  await adminDb.collection("vendors").doc(VENDOR_ID).set(
    {
      id: VENDOR_ID,
      businessName: "Notif Test Florist",
      categoryId: "florists",
      city: "Lahore",
      phone: "+15550002002",
      ownerUid: VENDOR_OWNER_UID,
      subscriptionTier: "basic",
      availableFor: ["mehndi", "baraat", "walima"],
      suspended: false,
      createdAt: Date.now(),
    },
    { merge: true }
  )

  await adminDb.collection("bookings").doc(BOOKING_ID).set(
    {
      id: BOOKING_ID,
      weddingId: WEDDING_ID,
      vendorId: VENDOR_ID,
      eventId: "mehndi",
      eventDate: "2026-12-01",
      status: "requested",
      price: 80000,
      paymentPath: "in_person",
      familyName: "Notif Family",
      weddingName: "Notif Test Wedding",
      vendorName: "Notif Test Florist",
      createdAt: Date.now(),
      createdByUid: FAMILY_UID,
    },
    { merge: true }
  )
}

type CreateInput = {
  recipientUid: string
  weddingId: string
  type: string
  message: string
  bookingId: string
  href?: string
  priority?: string
  actorUid: string
  actorName: string
}

async function createAs(actorUid: string, input: CreateInput) {
  return asUser(actorUid, async () => {
    const ref = doc(collection(clientDb, "notifications"))
    const payload = {
      id: ref.id,
      recipientUid: input.recipientUid,
      weddingId: input.weddingId,
      type: input.type,
      message: input.message,
      bookingId: input.bookingId,
      read: false,
      createdAt: Date.now(),
      actorUid: input.actorUid,
      actorName: input.actorName,
      ...(input.href ? { href: input.href } : {}),
      ...(input.priority ? { priority: input.priority } : {}),
    }
    await setDoc(ref, payload)
    return ref.id
  })
}

async function listAs(uid: string) {
  return asUser(uid, async () => {
    const q = query(
      collection(clientDb, "notifications"),
      where("recipientUid", "==", uid),
      orderBy("createdAt", "desc"),
      limit(50)
    )
    const snap = await getDocs(q)
    return snap.docs.map((d: { id: string; data: () => Record<string, unknown> }) => ({
      id: d.id,
      ...d.data(),
    }))
  })
}

async function tryReadOther(uid: string, notificationId: string) {
  return asUser(uid, async () => {
    try {
      const snap = await getDoc(doc(clientDb, "notifications", notificationId))
      // Missing docs can look like permission-denied depending on rules
      return { ok: snap.exists(), data: snap.exists() ? snap.data() : null }
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string }
      return { ok: false, code: err.code, message: err.message }
    }
  })
}

function okResult(p: Promise<string>) {
  return p.then(
    (id) => ({ ok: true as const, id }),
    (e: { code?: string; message?: string }) => ({
      ok: false as const,
      code: e.code,
      message: e.message,
    })
  )
}

async function main() {
  console.log("Seeding…")
  await seed()

  const quoteCreate = await okResult(
    createAs(VENDOR_OWNER_UID, {
      recipientUid: FAMILY_UID,
      weddingId: WEDDING_ID,
      type: "quote_received",
      message: "Notif Test Florist sent a quote of Rs 75,000 for Notif Test Wedding",
      bookingId: BOOKING_ID,
      href: `/vendors/bookings#booking-${BOOKING_ID}`,
      actorUid: VENDOR_OWNER_UID,
      actorName: "Notif Test Florist",
    })
  )
  console.log("quoteCreate", quoteCreate)

  const extraWorkCreate = await okResult(
    createAs(VENDOR_OWNER_UID, {
      recipientUid: FAMILY_UID,
      weddingId: WEDDING_ID,
      type: "extra_work_needed",
      message:
        "URGENT: Notif Test Florist requested extra work approval for Mehndi (Notif Test Wedding)",
      bookingId: BOOKING_ID,
      href: `/vendors/bookings#booking-${BOOKING_ID}`,
      priority: "urgent",
      actorUid: VENDOR_OWNER_UID,
      actorName: "Notif Test Florist",
    })
  )
  console.log("extraWorkCreate", extraWorkCreate)

  const disputeCreate = await okResult(
    createAs(FAMILY_UID, {
      recipientUid: VENDOR_OWNER_UID,
      weddingId: WEDDING_ID,
      type: "dispute_raised",
      message: "Notif Family raised a dispute on Notif Test Wedding (Mehndi)",
      bookingId: BOOKING_ID,
      href: `/vendor/jobs/${BOOKING_ID}`,
      actorUid: FAMILY_UID,
      actorName: "Notif Family",
    })
  )
  console.log("disputeCreate", disputeCreate)

  const familyList = await listAs(FAMILY_UID)
  const vendorList = await listAs(VENDOR_OWNER_UID)
  const unrelatedList = await listAs(UNRELATED_UID)

  const familySeesQuote = familyList.some(
    (n: { type?: string }) => n.type === "quote_received"
  )
  const familySeesUrgent = familyList.some(
    (n: { type?: string; priority?: string }) =>
      n.type === "extra_work_needed" && n.priority === "urgent"
  )
  const vendorSeesDispute = vendorList.some(
    (n: { type?: string }) => n.type === "dispute_raised"
  )

  const unrelatedReadOther = quoteCreate.ok
    ? await tryReadOther(UNRELATED_UID, quoteCreate.id)
    : { ok: false, skipped: true }

  const results = {
    quoteCreate,
    extraWorkCreate,
    disputeCreate,
    familySeesQuote,
    familySeesUrgent,
    familyCount: familyList.length,
    vendorSeesDispute,
    vendorCount: vendorList.length,
    unrelatedCount: unrelatedList.length,
    unrelatedReadOther,
  }
  console.log(JSON.stringify(results, null, 2))

  const failed =
    !quoteCreate.ok ||
    !extraWorkCreate.ok ||
    !disputeCreate.ok ||
    !familySeesQuote ||
    !familySeesUrgent ||
    !vendorSeesDispute ||
    unrelatedList.length > 0 ||
    unrelatedReadOther.ok === true

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
