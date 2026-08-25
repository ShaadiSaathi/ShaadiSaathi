/**
 * Staging-only: tiered collaborator access + instant revocation.
 * Run: npx tsx scripts/test-tiered-collaborator-access.ts
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
const { getFirestore, FieldValue } = require("firebase-admin/firestore")
const { initializeApp: initClient } = require("firebase/app")
const {
  getAuth: getClientAuth,
  signInWithCustomToken,
} = require("firebase/auth")
const {
  getFirestore: getClientFs,
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
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

const OWNER_UID = "tier-owner-staging"
const FULL_UID = "tier-full-staging"
const LIMITED_UID = "tier-limited-staging"
const WEDDING_ID = "staging-tier-wedding"
const GUEST_TOKEN = "a1b2c3d4-e5f6-4789-a012-3456789abcde"

async function clientFor(uid: string, claims?: Record<string, unknown>) {
  const token = await getAuth().createCustomToken(uid, claims)
  const appName = `tier-test-${uid}`
  const clientApp = initClient(
    {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    },
    appName
  )
  const auth = getClientAuth(clientApp)
  await signInWithCustomToken(auth, token)
  const idToken = await auth.currentUser?.getIdToken(true)
  return {
    fs: getClientFs(clientApp),
    auth,
    idToken,
  }
}

async function expectDenied(label: string, fn: () => Promise<unknown>): Promise<boolean> {
  try {
    await fn()
    console.error(`FAIL ${label}: expected permission denied`)
    return false
  } catch (err) {
    const code = (err as { code?: string }).code
    if (code === "permission-denied" || code === "PERMISSION_DENIED") {
      console.log(`PASS ${label}: denied`)
      return true
    }
    console.error(`FAIL ${label}: unexpected error`, err)
    return false
  }
}

async function main() {
  const adminDb = getFirestore()
  const adminAuth = getAuth()

  for (const uid of [OWNER_UID, FULL_UID, LIMITED_UID]) {
    try {
      await adminAuth.getUser(uid)
    } catch {
      await adminAuth.createUser({ uid, displayName: uid })
    }
  }

  await adminDb.collection("weddings").doc(WEDDING_ID).set({
    id: WEDDING_ID,
    name: "Tier Test Wedding",
    couple: "A & B",
    shareCode: "TIERTEST",
    isPremium: true,
    inviteTheme: "classic",
    ownerId: OWNER_UID,
    memberUids: [OWNER_UID, FULL_UID, LIMITED_UID],
    paymentApproverUids: [],
    collaboratorAccess: {
      [FULL_UID]: { role: "full", joinedAt: Date.now() - 86400000 },
      [LIMITED_UID]: {
        role: "limited",
        scopes: ["guests", "tasks"],
        joinedAt: Date.now() - 86400000,
      },
    },
    organiserName: "Owner",
    organiserPhone: "+15550002001",
    firstEventDate: "2026-09-01",
    createdAt: Date.now(),
  })

  await adminDb.collection("collaborator_tiers").doc(FULL_UID).set({
    weddingId: WEDDING_ID,
    uid: FULL_UID,
    role: "full",
    joinedAt: Date.now() - 86400000,
  })
  await adminDb.collection("collaborator_tiers").doc(LIMITED_UID).set({
    weddingId: WEDDING_ID,
    uid: LIMITED_UID,
    role: "limited",
    scopes: ["guests", "tasks"],
    joinedAt: Date.now() - 86400000,
  })

  await adminAuth.setCustomUserClaims(FULL_UID, {
    weddingCollaboratorRole: "full",
    weddingCollaboratorScopes: [],
  })
  await adminAuth.setCustomUserClaims(LIMITED_UID, {
    weddingCollaboratorRole: "limited",
    weddingCollaboratorScopes: ["guests", "tasks"],
  })

  await adminDb.collection("guests").doc(GUEST_TOKEN).set({
    id: GUEST_TOKEN,
    weddingId: WEDDING_ID,
    name: "Test Guest",
    phone: "+15550009999",
    events: [],
    rsvp: {},
    rsvpSource: {},
    rsvpUpdatedAt: {},
    rsvpOrganiserAlert: {},
    inviteToken: GUEST_TOKEN,
    updatedAt: Date.now(),
  })

  await adminDb.collection("vendors").doc("staging-vendor-tier").set(
    {
      id: "staging-vendor-tier",
      ownerUid: OWNER_UID,
      name: "Tier Test Vendor",
      verificationStatus: "unverified",
      createdAt: Date.now(),
    },
    { merge: true }
  )

  await adminDb.collection("bookings").doc("staging-tier-booking").set({
    id: "staging-tier-booking",
    weddingId: WEDDING_ID,
    vendorId: "staging-vendor-tier",
    eventId: "mehndi",
    status: "confirmed",
    price: 50000,
    paymentPath: "in_person",
    familyName: "Owner",
    weddingName: "Tier Test Wedding",
    createdAt: Date.now(),
  })

  await adminDb.collection("tasks").doc("staging-tier-task").set({
    id: "staging-tier-task",
    weddingId: WEDDING_ID,
    title: "Tier test task",
    assignee: "Owner",
    dueDate: "2026-09-01",
    status: "todo",
    createdAt: Date.now(),
  })

  await adminDb.collection("events").doc("staging-tier-event").set({
    id: "staging-tier-event",
    weddingId: WEDDING_ID,
    name: "Tier Mehndi",
    date: "2026-09-01",
    createdAt: Date.now(),
  })

  await adminDb.collection("wedding_activity").add({
    weddingId: WEDDING_ID,
    actorUid: FULL_UID,
    actorName: "Full Collab",
    action: "guest_updated",
    summary: "Seed activity entry",
    createdAt: Date.now(),
  })

  let ok = true
  const limitedClient = await clientFor(LIMITED_UID, {
    weddingCollaboratorRole: "limited",
    weddingCollaboratorScopes: ["guests", "tasks"],
  })
  const fullClient = await clientFor(FULL_UID, {
    weddingCollaboratorRole: "full",
    weddingCollaboratorScopes: [],
  })
  const limitedFs = limitedClient.fs
  const fullFs = fullClient.fs

  if (limitedClient.auth.currentUser?.uid !== LIMITED_UID) {
    console.error(
      "FAIL limited client signed in as wrong uid:",
      limitedClient.auth.currentUser?.uid
    )
    process.exit(1)
  }

  const tierSnap = await getDoc(
    doc(limitedFs, "collaborator_tiers", LIMITED_UID)
  )
  if (!tierSnap.exists()) {
    console.error("FAIL limited tier doc missing for client read")
    ok = false
  } else {
    console.log("PASS limited tier doc readable:", tierSnap.data()?.role)
  }

  ok &&= await expectDenied("limited read booking", async () => {
    const snap = await getDoc(doc(limitedFs, "bookings", "staging-tier-booking"))
    if (snap.exists()) {
      throw new Error(`unexpected read success: ${JSON.stringify(snap.data())}`)
    }
  })

  ok &&= await expectDenied("limited read events", async () => {
    const snap = await getDoc(doc(limitedFs, "events", "staging-tier-event"))
    if (snap.exists()) {
      throw new Error("unexpected event read success")
    }
  })

  ok &&= await expectDenied("limited list bookings", async () => {
    await getDocs(
      query(collection(limitedFs, "bookings"), where("weddingId", "==", WEDDING_ID))
    )
  })

  const guestSnap = await getDoc(doc(limitedFs, "guests", GUEST_TOKEN))
  if (!guestSnap.exists()) {
    console.error("FAIL limited read guest")
    ok = false
  } else {
    console.log("PASS limited read guest")
  }

  const taskSnap = await getDoc(doc(limitedFs, "tasks", "staging-tier-task"))
  if (!taskSnap.exists()) {
    console.error("FAIL limited read task")
    ok = false
  } else {
    console.log("PASS limited read task")
  }

  const fullBooking = await getDoc(doc(fullFs, "bookings", "staging-tier-booking"))
  if (!fullBooking.exists()) {
    console.error("FAIL full read booking")
    ok = false
  } else {
    console.log("PASS full read booking")
  }

  await adminDb.collection("weddings").doc(WEDDING_ID).update({
    memberUids: FieldValue.arrayRemove(LIMITED_UID),
    [`collaboratorAccess.${LIMITED_UID}`]: FieldValue.delete(),
  })
  await adminDb.collection("collaborator_tiers").doc(LIMITED_UID).delete()

  await adminDb.collection("collaborator_tiers").doc(LIMITED_UID).delete()

  ok &&= await expectDenied("removed limited read task (same session)", async () => {
    const snap = await getDoc(doc(limitedFs, "tasks", "staging-tier-task"))
    if (snap.exists()) {
      throw new Error("removed collaborator still read task data")
    }
  })

  ok &&= await expectDenied("removed limited list guests", async () => {
    await getDocs(
      query(collection(limitedFs, "guests"), where("weddingId", "==", WEDDING_ID))
    )
  })

  const activitySnap = await getDocs(
    query(
      collection((await clientFor(OWNER_UID)).fs, "wedding_activity"),
      where("weddingId", "==", WEDDING_ID)
    )
  )
  if (activitySnap.empty) {
    console.error("FAIL owner activity log read")
    ok = false
  } else {
    console.log(`PASS owner activity log (${activitySnap.size} entries)`)
  }

  ok &&= await expectDenied("limited read activity log", async () => {
    await getDocs(
      query(
        collection(limitedFs, "wedding_activity"),
        where("weddingId", "==", WEDDING_ID)
      )
    )
  })

  console.log(ok ? "PASS tiered collaborator access" : "FAIL tiered collaborator access")
  process.exit(ok ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
