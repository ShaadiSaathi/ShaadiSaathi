/**
 * Read-only scan: count legacy (guessable) vs UUID guest invite tokens on production.
 * Run: npx tsx scripts/scan-production-guest-tokens.ts
 */
import { existsSync, readFileSync } from "fs"
import { createRequire } from "module"
import { fileURLToPath } from "url"
import { dirname, join } from "path"
import { isGuestInviteToken } from "../lib/guest-invite-token"

const PRODUCTION_PROJECT_ID = "shaadi-saathi-dd3da"
const require = createRequire(import.meta.url)
const root = join(dirname(fileURLToPath(import.meta.url)), "..")

function loadEnvFile(path: string) {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, "utf8").split("\n")) {
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
}

loadEnvFile(join(root, ".env.production.local"))
loadEnvFile(join(root, ".env.local"))

const { cert, getApps, initializeApp, applicationDefault } = require("firebase-admin/app")
const { getFirestore } = require("firebase-admin/firestore")

function initProductionAdmin() {
  const raw = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON?.trim()
  if (raw) {
    const sa = JSON.parse(raw)
    if (sa.project_id !== PRODUCTION_PROJECT_ID) {
      console.error(
        `ABORT: FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON is for ${sa.project_id}, expected ${PRODUCTION_PROJECT_ID}.`
      )
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
    return
  }

  if (!getApps().length) {
    initializeApp({
      credential: applicationDefault(),
      projectId: PRODUCTION_PROJECT_ID,
    })
  }
}

async function main() {
  initProductionAdmin()
  const db = getFirestore()
  const snap = await db.collection("guests").get()
  const legacy = snap.docs.filter((d: { id: string }) => !isGuestInviteToken(d.id))
  const uuid = snap.size - legacy.length

  console.log(`Project: ${PRODUCTION_PROJECT_ID}`)
  console.log(`Guests scanned: ${snap.size}`)
  console.log(`UUID tokens: ${uuid}`)
  console.log(`Legacy guessable tokens: ${legacy.length}`)

  if (legacy.length > 0) {
    console.log("\nSample legacy doc ids (max 10):")
    for (const d of legacy.slice(0, 10)) {
      const data = d.data() as { weddingId?: string; name?: string }
      console.log(`  ${d.id} wedding=${data.weddingId ?? "?"} name=${data.name ?? "?"}`)
    }
    process.exit(1)
  }

  console.log("PASS: no legacy guessable guest tokens on production")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
