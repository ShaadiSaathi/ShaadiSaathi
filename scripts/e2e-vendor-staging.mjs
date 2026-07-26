/**
 * E2E test against the shaadisaathistaging Firestore project.
 * Mirrors what lib/firebase/vendors.ts createVendorForUser writes.
 * Usage: node scripts/e2e-vendor-staging.mjs
 */
import { readFileSync } from "node:fs"
import { initializeApp, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

// --- Load FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON from .env.local ---
const envText = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
const line = envText
  .split("\n")
  .find((l) => l.startsWith("FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON="))
if (!line) {
  console.error("FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON not found in .env.local")
  process.exit(1)
}
let raw = line.slice("FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON=".length).trim()
if (
  (raw.startsWith("'") && raw.endsWith("'")) ||
  (raw.startsWith('"') && raw.endsWith('"') && raw[1] !== "{")
) {
  raw = raw.slice(1, -1)
}
const serviceAccount = JSON.parse(raw)
if (typeof serviceAccount.private_key === "string") {
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n")
}

if (serviceAccount.project_id !== "shaadisaathistaging") {
  console.error(
    `ABORT: service account project is "${serviceAccount.project_id}", expected "shaadisaathistaging". Refusing to touch a non-staging project.`
  )
  process.exit(1)
}

initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id })
const db = getFirestore()

const MOCK_NAMES = [
  "Biryani & Barbecue Co.",
  "Royal Feast Caterers",
  "Dhol Beats Lahore",
  "Lens & Light Studios",
  "Shaadi Frames",
  "Gulzar Decor Studio",
  "DJ Raza & Sound Co.",
  "Henna by Saba",
  "Glam by Nadia",
  "Baraat Motors & Decor",
  "Sangeet Symphony",
  "Shamiana Kings",
  "Spice Route Kitchen",
  "Mehndi Motion",
]

async function listVendors(label) {
  const snap = await db.collection("vendors").get()
  console.log(`\n=== Vendors ${label}: ${snap.size} doc(s) ===`)
  for (const d of snap.docs) {
    const v = d.data()
    console.log(`  - ${d.id}  businessName="${v.businessName}"  city=${v.city}  category=${v.categoryId}  ownerUid=${v.ownerUid}`)
  }
  return snap.docs
}

// Same gradient logic as lib/firebase/vendors.ts
const DEFAULT_COVER_GRADIENTS = [
  "from-amber-200 via-orange-100 to-rose-100",
  "from-emerald-100 via-amber-50 to-rose-50",
  "from-rose-200 via-maroon/20 to-gold/30",
  "from-sky-100 via-indigo-50 to-violet-100",
  "from-stone-200 via-amber-50 to-orange-100",
]
function coverGradientForId(id) {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash + id.charCodeAt(i) * (i + 1)) % DEFAULT_COVER_GRADIENTS.length
  }
  return DEFAULT_COVER_GRADIENTS[hash] ?? DEFAULT_COVER_GRADIENTS[0]
}

const TEST_UID = "e2e-vendor-test-uid"

async function main() {
  // (a) BEFORE
  const before = await listVendors("BEFORE")

  // (b) Create vendor doc the way createVendorForUser does
  const vendorRef = db.collection("vendors").doc() // unique auto-id
  const vendorId = vendorRef.id
  const vendor = {
    id: vendorId,
    businessName: "Amina Mehndi Artistry",
    categoryId: "mehndi-artists",
    city: "Lahore",
    phone: "+923001112233",
    bio: "Intricate bridal mehndi with 10+ years of experience across Lahore. Specialising in traditional Pakistani and Arabic designs for mehndi nights.",
    ownerUid: TEST_UID,
    subscriptionTier: "basic",
    availableFor: ["mehndi", "baraat", "walima"],
    completedJobsCount: 0,
    emergencyAvailable: false,
    reliabilityScore: 90,
    noShowCount: 0,
    suspended: false,
    acceptsCardInPerson: false,
    featuredBoost: 0,
    coverGradient: coverGradientForId(vendorId),
    createdAt: Date.now(),
  }
  await vendorRef.set(vendor)
  console.log(`\nCreated vendor doc vendors/${vendorId}`)

  // (c) Upsert users/{uid} with role vendor + vendorId
  const userDoc = {
    uid: TEST_UID,
    role: "vendor",
    phone: vendor.phone,
    name: vendor.businessName,
    vendorId,
    createdAt: Date.now(),
  }
  await db.collection("users").doc(TEST_UID).set(userDoc, { merge: true })
  console.log(`Upserted users/${TEST_UID} -> role=vendor vendorId=${vendorId}`)

  // (d) AFTER
  const after = await listVendors("AFTER")
  const found = after.find((d) => d.id === vendorId)
  console.log(
    found
      ? `\nPASS: new vendor ${vendorId} ("${found.data().businessName}") appears in vendors collection`
      : `\nFAIL: new vendor ${vendorId} NOT found in vendors collection`
  )

  // (e) No mock vendor names in Firestore
  const namesInDb = after.map((d) => d.data().businessName)
  const leaked = MOCK_NAMES.filter((n) => namesInDb.includes(n))
  console.log(
    leaked.length === 0
      ? "PASS: no mock vendor names (e.g. \"Biryani & Barbecue Co.\", \"Royal Feast Caterers\") exist in Firestore"
      : `FAIL: mock vendor names found in Firestore: ${leaked.join(", ")}`
  )

  // (f) Print created vendor id + fields
  const finalSnap = await vendorRef.get()
  console.log(`\n=== Created vendor ${vendorId} (as stored) ===`)
  console.log(JSON.stringify(finalSnap.data(), null, 2))

  const userSnap = await db.collection("users").doc(TEST_UID).get()
  console.log(`\n=== users/${TEST_UID} (as stored) ===`)
  console.log(JSON.stringify(userSnap.data(), null, 2))

  process.exit(found && leaked.length === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error("E2E script failed:", err)
  process.exit(1)
})
