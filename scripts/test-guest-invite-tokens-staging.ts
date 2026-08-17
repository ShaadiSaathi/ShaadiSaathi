/**
 * Staging-only: guest invite tokens are random UUIDs, not reconstructable.
 *
 * Checks:
 * 1) makeGuestInviteToken() is UUID v4 and not stable
 * 2) Unauthenticated get of a new-token guest succeeds (invite-link flow)
 * 3) Reconstructed FNV-1a / name-slug tokens do not resolve to guest data
 * 4) Guest RSVP-only update still works with the new token
 *
 * Run: npx tsx scripts/test-guest-invite-tokens-staging.ts
 */
import { readFileSync } from "fs"
import { createRequire } from "module"
import { isGuestInviteToken, makeGuestInviteToken } from "../lib/guest-invite-token"

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

const { cert, getApps, initializeApp } = require("firebase-admin/app")
const { getFirestore } = require("firebase-admin/firestore")
const { initializeApp: initClient } = require("firebase/app")
const { getFirestore: getClientFs, doc, getDoc, updateDoc, setDoc } = require("firebase/firestore")

const sa = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON!)
if (sa.project_id !== "shaadisaathistaging") {
  console.error("ABORT: staging only")
  process.exit(2)
}
if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== "shaadisaathistaging") {
  console.error("ABORT: NEXT_PUBLIC_FIREBASE_PROJECT_ID must be shaadisaathistaging")
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

const WEDDING_ID = "staging-perm-wedding"
const TEST_NAME = "Invite Token Security Probe"

function legacyFnvInviteToken(weddingId: string, name: string): string {
  const normalized = name.trim().toLowerCase().replace(/\s+/g, " ")
  const slug = normalized
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 20)
  const key = `${weddingId}:${normalized}`
  let hash = 2166136261
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return `${slug || "guest"}-w${(hash >>> 0).toString(36)}`
}

function legacySlugInviteToken(id: string, name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 20)
  return `${slug}-${id.replace(/^guest-/, "")}`
}

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`)
  process.exit(1)
}

async function main() {
  const a = makeGuestInviteToken()
  const b = makeGuestInviteToken()
  if (!isGuestInviteToken(a) || !isGuestInviteToken(b)) {
    fail("makeGuestInviteToken did not return UUID v4")
  }
  if (a === b) fail("makeGuestInviteToken is not random")
  const derived = legacyFnvInviteToken(WEDDING_ID, TEST_NAME)
  if (a === derived || isGuestInviteToken(derived)) {
    fail("new tokens must not match the old FNV pattern")
  }
  console.log("ok  token generator is random UUID v4")

  const adminDb = getFirestore()
  const clientApp = initClient(
    {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    },
    "guest-invite-token-test"
  )
  const clientDb = getClientFs(clientApp)

  const leftover = await adminDb
    .collection("guests")
    .where("weddingId", "==", WEDDING_ID)
    .get()
  const leftoverProbe = leftover.docs.filter(
    (d: { data: () => { name?: string } }) => d.data().name === TEST_NAME
  )
  await Promise.all(leftoverProbe.map((d: { ref: { delete: () => Promise<void> } }) => d.ref.delete()))

  const inviteToken = makeGuestInviteToken()
  const now = Date.now()
  await adminDb.collection("guests").doc(inviteToken).set({
    id: `guest-${inviteToken}`,
    weddingId: WEDDING_ID,
    name: TEST_NAME,
    phone: "+92 300 000 0000",
    events: ["mehndi", "baraat", "walima"],
    rsvp: { mehndi: "pending", baraat: "pending", walima: "pending" },
    rsvpSource: { mehndi: "organiser", baraat: "organiser", walima: "organiser" },
    rsvpUpdatedAt: { mehndi: null, baraat: null, walima: null },
    rsvpOrganiserAlert: { mehndi: false, baraat: false, walima: false },
    inviteToken,
    notes: "staging invite-token security probe",
    updatedAt: now,
  })

  try {
    const publicSnap = await getDoc(doc(clientDb, "guests", inviteToken))
    if (!publicSnap.exists()) fail("unauthenticated get of new invite token returned missing")
    const publicData = publicSnap.data() as { name?: string; phone?: string }
    if (publicData.name !== TEST_NAME) fail("invite-link get returned unexpected guest")
    if (!publicData.phone) fail("invite-link get missing guest fields")
    console.log("ok  unauthenticated invite-link get resolves the random token")

    await updateDoc(doc(clientDb, "guests", inviteToken), {
      "rsvp.mehndi": "confirmed",
      "rsvpSource.mehndi": "guest",
      "rsvpUpdatedAt.mehndi": Date.now(),
      updatedAt: Date.now(),
    })
    const afterRsvp = await adminDb.collection("guests").doc(inviteToken).get()
    if (afterRsvp.data()?.rsvp?.mehndi !== "confirmed") {
      fail("unauthenticated RSVP update did not persist")
    }
    console.log("ok  unauthenticated RSVP update works with the new token")

    const fnv = legacyFnvInviteToken(WEDDING_ID, TEST_NAME)
    const fnvSnap = await getDoc(doc(clientDb, "guests", fnv))
    if (fnvSnap.exists()) fail("reconstructed FNV-1a token still resolves to a guest")
    console.log("ok  reconstructed FNV-1a token does not resolve")

    try {
      await setDoc(doc(clientDb, "guests", fnv), {
        id: `guest-${fnv}`,
        weddingId: WEDDING_ID,
        name: TEST_NAME,
        phone: "+92 300 000 0000",
        events: ["mehndi"],
        rsvp: { mehndi: "pending", baraat: null, walima: null },
        rsvpSource: { mehndi: "organiser", baraat: null, walima: null },
        rsvpUpdatedAt: { mehndi: null, baraat: null, walima: null },
        rsvpOrganiserAlert: { mehndi: false, baraat: false, walima: false },
        inviteToken: fnv,
        notes: "should be denied",
        updatedAt: Date.now(),
      })
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: unknown }).code)
          : String(err)
      if (!code.includes("permission-denied")) {
        fail(`expected permission-denied for guessable create, got ${code}`)
      }
    }
    const fnvAfter = await adminDb.collection("guests").doc(fnv).get()
    if (fnvAfter.exists) {
      await fnvAfter.ref.delete()
      fail("guessable token guest doc was persisted on the server")
    }
    console.log("ok  unauthenticated create with a guessable token is denied")

    const slug = legacySlugInviteToken(`guest-${inviteToken}`, TEST_NAME)
    const slugSnap = await getDoc(doc(clientDb, "guests", slug))
    if (slugSnap.exists()) fail("reconstructed name-slug token still resolves to a guest")
    console.log("ok  reconstructed name-slug token does not resolve")

    const allGuests = await adminDb.collection("guests").get()
    const legacyLeft = allGuests.docs.filter((d: { id: string }) => !isGuestInviteToken(d.id))
    if (legacyLeft.length > 0) {
      fail(`${legacyLeft.length} staging guest docs still use legacy token ids`)
    }
    console.log("ok  no staging guest docs remain on guessable token ids")

    const realGuests = allGuests.docs.filter(
      (d: { data: () => { name?: string; weddingId?: string } }) =>
        d.data().weddingId === WEDDING_ID && d.data().name !== TEST_NAME
    )
    for (const g of realGuests) {
      const name = String(g.data().name ?? "")
      if (!name) continue
      const guess = legacyFnvInviteToken(WEDDING_ID, name)
      const guessSnap = await getDoc(doc(clientDb, "guests", guess))
      if (guessSnap.exists()) {
        fail("FNV reconstruction of a staging guest name still returns guest data")
      }
    }
    console.log("ok  FNV reconstruction of existing staging guest names does not hit data")
  } finally {
    await adminDb.collection("guests").doc(inviteToken).delete()
    const fnvLeftover = legacyFnvInviteToken(WEDDING_ID, TEST_NAME)
    const fnvDoc = await adminDb.collection("guests").doc(fnvLeftover).get()
    if (fnvDoc.exists) await fnvDoc.ref.delete()
  }

  console.log("PASS guest invite token security")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
