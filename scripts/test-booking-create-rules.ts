/**
 * Staging: confirm Firestore rules reject client-side confirmed booking creates.
 * Run: npx tsx scripts/test-booking-create-rules.ts
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
const { initializeApp: initClient } = require("firebase/app")
const { getAuth: getClientAuth, signInWithCustomToken } = require("firebase/auth")
const { getFirestore, doc, setDoc } = require("firebase/firestore")

const sa = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON || "{}")
if (!getApps().length) {
  initializeApp({ credential: cert(sa), projectId: "shaadisaathistaging" })
}

async function main() {
  const adminAuth = getAuth()
  try {
    await adminAuth.createUser({ uid: "staging-conflict-owner-b" })
  } catch {
    /* exists */
  }
  const token = await adminAuth.createCustomToken("staging-conflict-owner-b")
  const app = initClient({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: "shaadisaathistaging",
  })
  const auth = getClientAuth(app)
  await signInWithCustomToken(auth, token)
  const db = getFirestore(app)

  try {
    await setDoc(doc(db, "bookings", "staging-client-confirmed-should-fail"), {
      id: "staging-client-confirmed-should-fail",
      weddingId: "staging-conflict-wedding-b",
      vendorId: "staging-conflict-vendor",
      eventId: "walima",
      eventDate: "2026-11-29",
      status: "confirmed",
      price: 1,
      paymentPath: "in_person",
      familyName: "B",
      weddingName: "B",
      vendorName: "V",
      createdAt: Date.now(),
    })
    console.error("FAIL: client confirmed create was allowed")
    process.exit(1)
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string }
    console.log("PASS: client confirmed create rejected:", err.code || err.message)
  }
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
