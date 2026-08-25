/**
 * Mint short-lived staging login links for family + vendor test accounts.
 * Staging Firebase only. Tokens expire (~1h).
 * Run: npx tsx scripts/mint-staging-login-links.ts
 */
import { readFileSync, writeFileSync } from "fs"
import { createRequire } from "module"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

const require = createRequire(fileURLToPath(import.meta.url))
const root = join(dirname(fileURLToPath(import.meta.url)), "..")

for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
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
const { getAuth } = require("firebase-admin/auth")
const { getFirestore } = require("firebase-admin/firestore")

const sa = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON!)
if (sa.project_id !== "shaadisaathistaging") {
  console.error("ABORT: staging only")
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

const FAMILY_UID = "perm-owner-staging"
const VENDOR_OWNER_UID = "staging-vendor-perm-owner"
const VENDOR_ID = "staging-vendor-perm"
const WEDDING_ID = "staging-perm-wedding"

/** Host must use NEXT_PUBLIC_FIREBASE_PROJECT_ID=shaadisaathistaging */
const BASE =
  process.env.STAGING_APP_URL?.replace(/\/$/, "") ||
  "https://shaadi-saathi-git-staging-altafemaad2009-2751s-projects.vercel.app"

async function main() {
  const db = getFirestore()
  const auth = getAuth()

  for (const uid of [FAMILY_UID, VENDOR_OWNER_UID]) {
    try {
      await auth.getUser(uid)
    } catch {
      await auth.createUser({ uid, displayName: uid })
    }
  }

  await db.collection("weddings").doc(WEDDING_ID).set(
    {
      id: WEDDING_ID,
      name: "Permissions Test Wedding",
      couple: "Owner & Collab",
      shareCode: "PERMTEST",
      isPremium: true,
      inviteTheme: "classic",
      ownerId: FAMILY_UID,
      memberUids: [FAMILY_UID, "perm-collab-staging"],
      organiserName: "Person A Owner",
      organiserPhone: "+15550001001",
      firstEventDate: "2026-09-01",
      createdAt: Date.now(),
    },
    { merge: true }
  )

  await db.collection("users").doc(FAMILY_UID).set(
    {
      uid: FAMILY_UID,
      role: "family",
      phone: "+15550001001",
      name: "Person A Owner",
      weddingId: WEDDING_ID,
      createdAt: Date.now(),
    },
    { merge: true }
  )

  const vendorSnap = await db.collection("vendors").doc(VENDOR_ID).get()
  if (!vendorSnap.exists) {
    await db.collection("vendors").doc(VENDOR_ID).set({
      id: VENDOR_ID,
      businessName: "Staging Perm Vendor",
      categoryId: "photography",
      city: "Karachi",
      phone: "+15550001999",
      bio: "Staging vendor for permission and review tests.",
      ownerUid: VENDOR_OWNER_UID,
      subscriptionTier: "basic",
      availableFor: ["mehndi", "baraat", "walima"],
      verificationStatus: "verified",
      onboardingStatus: "verified",
      completedJobsCount: 3,
      rating: 0,
      reviewCount: 0,
      createdAt: Date.now(),
    })
  } else {
    await db
      .collection("vendors")
      .doc(VENDOR_ID)
      .set({ ownerUid: VENDOR_OWNER_UID }, { merge: true })
  }

  await db.collection("users").doc(VENDOR_OWNER_UID).set(
    {
      uid: VENDOR_OWNER_UID,
      role: "vendor",
      phone: "+15550001999",
      name: "Staging Perm Vendor",
      vendorId: VENDOR_ID,
      createdAt: Date.now(),
    },
    { merge: true }
  )

  const familyToken = await auth.createCustomToken(FAMILY_UID)
  const vendorToken = await auth.createCustomToken(VENDOR_OWNER_UID)

  const familyUrl = `${BASE}/admin-test/session?token=${encodeURIComponent(familyToken)}&next=${encodeURIComponent("/dashboard")}`
  const vendorUrl = `${BASE}/admin-test/session?token=${encodeURIComponent(vendorToken)}&next=${encodeURIComponent("/vendor/dashboard")}`

  const out = [
    `Staging Firebase login links (expire ~1 hour)`,
    `Base: ${BASE}`,
    ``,
    `Family (Person A Owner):`,
    familyUrl,
    ``,
    `Vendor (Staging Perm Vendor):`,
    vendorUrl,
    ``,
  ].join("\n")

  // Write to a gitignored local file so tokens aren't pasted into chat logs by accident
  const outPath = join(root, ".staging-login-links.txt")
  writeFileSync(outPath, out, "utf8")
  console.log(`Wrote ${outPath}`)
  console.log(out)
}

void main()
