/**
 * Staging Firebase data + local PDF render (no Vercel host required).
 * Validates owner/full export buffers and limited collaborator denial.
 *
 * Run: npx tsx scripts/test-wedding-plan-export-local.ts
 */
import { readFileSync, writeFileSync } from "fs"
import { join } from "path"
import { renderToBuffer } from "@react-pdf/renderer"
import { WeddingPlanPdfDocument } from "../lib/wedding-plan-export/WeddingPlanPdf"
import {
  buildWeddingPlanExportSnapshot,
} from "../lib/server/wedding-plan-export"
import { PaymentAuthError } from "../lib/server/payment-auth"
import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

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

async function renderFor(uid: string, name: string): Promise<Buffer> {
  const snapshot = await buildWeddingPlanExportSnapshot({
    uid,
    weddingId: WEDDING_ID,
    exportedByName: name,
    payload: {
      daySchedules: {
        mehndi: [
          { time: "14:00", label: "Henna artists arrive" },
          { time: "16:00", label: "Guest seating" },
        ],
      },
    },
  })

  if (!snapshot.includeFinancials) {
    throw new Error(`${uid}: expected financials for owner/full`)
  }
  if (!snapshot.bookings.some((b) => typeof b.amountPkr === "number")) {
    throw new Error(`${uid}: booking amounts missing`)
  }

  const buffer = await renderToBuffer(
    (<WeddingPlanPdfDocument snapshot={snapshot} />) as Parameters<
      typeof renderToBuffer
    >[0]
  )
  return Buffer.from(buffer)
}

async function main() {
  await ensureSeed()
  let failed = 0

  try {
    const ownerPdf = await renderFor(OWNER_UID, "Tier Owner")
    if (ownerPdf.subarray(0, 4).toString() !== "%PDF") {
      console.error("FAIL owner: not a PDF")
      failed++
    } else {
      const out = join(process.cwd(), ".staging-wedding-plan-owner.pdf")
      writeFileSync(out, ownerPdf)
      console.log(`PASS owner: ${ownerPdf.length} bytes → ${out}`)
    }
  } catch (err) {
    console.error("FAIL owner", err)
    failed++
  }

  try {
    const fullPdf = await renderFor(FULL_UID, "Full Collab")
    if (fullPdf.subarray(0, 4).toString() !== "%PDF") {
      console.error("FAIL full: not a PDF")
      failed++
    } else {
      console.log(`PASS full: ${fullPdf.length} bytes`)
    }
  } catch (err) {
    console.error("FAIL full", err)
    failed++
  }

  try {
    await buildWeddingPlanExportSnapshot({
      uid: LIMITED_UID,
      weddingId: WEDDING_ID,
      exportedByName: "Limited Collab",
    })
    console.error("FAIL limited: expected denial")
    failed++
  } catch (err) {
    if (err instanceof PaymentAuthError && err.status === 403) {
      console.log(`PASS limited denied: ${err.message}`)
    } else {
      console.error("FAIL limited unexpected", err)
      failed++
    }
  }

  if (failed > 0) {
    console.error(`\n${failed} check(s) failed`)
    process.exit(1)
  }
  console.log("\nAll local wedding-plan PDF checks passed")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
