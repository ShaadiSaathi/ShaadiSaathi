/**
 * Staging smoke: premium wedding-plan PDF export + collaborator gate.
 *
 * Seeds tier wedding data if needed, then:
 * - owner → 200 PDF (%PDF)
 * - full collaborator → 200 PDF with amounts (financials allowed)
 * - limited collaborator → 403
 *
 * Run (staging Firebase + staging host):
 *   npx tsx scripts/test-wedding-plan-export-staging.ts
 */

import { readFileSync, writeFileSync } from "fs"
import { join } from "path"
import { createRequire } from "module"
import { apiAuthHeaders } from "./lib/api-auth-headers"

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
const { initializeApp: initClient } = require("firebase/app")
const {
  getAuth: getClientAuth,
  signInWithCustomToken,
} = require("firebase/auth")

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

const BASE =
  process.env.STAGING_BASE_URL?.replace(/\/$/, "") ||
  "https://shaadi-saathi-git-staging-altafemaad2009-2751s-projects.vercel.app"

async function idTokenFor(uid: string): Promise<string> {
  const token = await getAuth().createCustomToken(uid)
  const clientApp = initClient(
    {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    },
    `pdf-export-${uid}-${Date.now()}`
  )
  const auth = getClientAuth(clientApp)
  await signInWithCustomToken(auth, token)
  const idToken = await auth.currentUser?.getIdToken(true)
  if (!idToken) throw new Error(`No id token for ${uid}`)
  return idToken
}

async function ensureSeed(): Promise<void> {
  const adminDb = getFirestore()
  const adminAuth = getAuth()

  for (const uid of [OWNER_UID, FULL_UID, LIMITED_UID]) {
    try {
      await adminAuth.getUser(uid)
    } catch {
      await adminAuth.createUser({ uid, displayName: uid })
    }
  }

  await adminDb.collection("weddings").doc(WEDDING_ID).set(
    {
      id: WEDDING_ID,
      name: "Tier Test Wedding",
      couple: "Ayesha & Omar",
      shareCode: "TIER01",
      isPremium: true,
      inviteTheme: "classic",
      ownerId: OWNER_UID,
      memberUids: [OWNER_UID, FULL_UID, LIMITED_UID],
      organiserName: "Tier Owner",
      organiserPhone: "+10000000001",
      firstEventDate: "2026-10-10",
      createdAt: Date.now(),
      planningPreferences: {
        plannedEvents: ["mehndi", "nikah", "baraat", "walima"],
        budgetTier: "mid",
      },
      collaboratorAccess: {
        [FULL_UID]: { role: "full", joinedAt: Date.now() },
        [LIMITED_UID]: {
          role: "limited",
          scopes: ["guests", "tasks"],
          joinedAt: Date.now(),
        },
      },
    },
    { merge: true }
  )

  for (const [uid, name] of [
    [OWNER_UID, "Tier Owner"],
    [FULL_UID, "Full Collab"],
    [LIMITED_UID, "Limited Collab"],
  ] as const) {
    await adminDb.collection("users").doc(uid).set(
      {
        uid,
        name,
        role: "family",
        weddingId: WEDDING_ID,
        phone: `+1000000${uid.slice(-3)}`,
        createdAt: Date.now(),
      },
      { merge: true }
    )
  }

  await adminDb.collection("guests").doc("staging-tier-guest-pdf").set(
    {
      id: "staging-tier-guest-pdf",
      weddingId: WEDDING_ID,
      name: "Uncle Bilal",
      kind: "individual",
      events: ["mehndi", "baraat"],
      rsvp: { mehndi: "confirmed", baraat: "pending" },
      inviteToken: "pdf-export-guest-token-0001",
      createdAt: Date.now(),
    },
    { merge: true }
  )

  await adminDb.collection("bookings").doc("staging-tier-booking-pdf").set(
    {
      id: "staging-tier-booking-pdf",
      weddingId: WEDDING_ID,
      vendorId: "staging-vendor-tier",
      vendorName: "Golden Lens Studio",
      packageName: "Mehndi coverage",
      eventId: "mehndi",
      eventDate: "2026-10-10",
      status: "confirmed",
      price: 125000,
      createdAt: Date.now(),
    },
    { merge: true }
  )

  await adminDb.collection("tasks").doc("staging-tier-task-pdf").set(
    {
      id: "staging-tier-task-pdf",
      weddingId: WEDDING_ID,
      title: "Confirm mehndi florist",
      assignee: "Tier Owner",
      dueDate: "2026-09-01",
      status: "todo",
      priority: "high",
      eventId: "mehndi",
      createdAt: Date.now(),
    },
    { merge: true }
  )
}

async function exportAs(uid: string): Promise<Response> {
  const idToken = await idTokenFor(uid)
  const headers = await apiAuthHeaders(idToken)
  return fetch(`${BASE}/api/wedding-plan/export`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      daySchedules: {
        mehndi: [
          { time: "14:00", label: "Henna artists arrive" },
          { time: "16:00", label: "Guest seating" },
        ],
      },
    }),
  })
}

async function main() {
  console.log(`Host: ${BASE}`)
  await ensureSeed()

  let failed = 0

  const ownerRes = await exportAs(OWNER_UID)
  const ownerBuf = Buffer.from(await ownerRes.arrayBuffer())
  if (ownerRes.status !== 200 || ownerBuf.subarray(0, 4).toString() !== "%PDF") {
    console.error(
      `FAIL owner export: status=${ownerRes.status} bytes=${ownerBuf.length} head=${ownerBuf.subarray(0, 20).toString()}`
    )
    failed++
  } else {
    const out = join(process.cwd(), ".staging-wedding-plan-owner.pdf")
    writeFileSync(out, ownerBuf)
    console.log(`PASS owner export: ${ownerBuf.length} bytes → ${out}`)
  }

  const fullRes = await exportAs(FULL_UID)
  const fullBuf = Buffer.from(await fullRes.arrayBuffer())
  if (fullRes.status !== 200 || fullBuf.subarray(0, 4).toString() !== "%PDF") {
    console.error(`FAIL full export: status=${fullRes.status}`)
    failed++
  } else {
    console.log(`PASS full export: ${fullBuf.length} bytes`)
  }

  const limitedRes = await exportAs(LIMITED_UID)
  const limitedJson = (await limitedRes.json().catch(() => ({}))) as {
    error?: string
  }
  if (limitedRes.status !== 403) {
    console.error(
      `FAIL limited should be 403: status=${limitedRes.status}`,
      limitedJson
    )
    failed++
  } else {
    console.log(`PASS limited denied: ${limitedJson.error ?? "403"}`)
  }

  if (failed > 0) {
    console.error(`\n${failed} check(s) failed`)
    process.exit(1)
  }
  console.log("\nAll wedding-plan PDF export checks passed")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
