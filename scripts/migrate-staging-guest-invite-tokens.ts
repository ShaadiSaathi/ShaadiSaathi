/**
 * Staging-only: rewrite guest docs that still use guessable invite tokens
 * (FNV-1a / name-slug ids) to crypto.randomUUID() document ids.
 *
 * Old invite links are invalidated. Mapping is written to
 * .staging-guest-token-migration.json (gitignored).
 *
 * Run: npx tsx scripts/migrate-staging-guest-invite-tokens.ts
 */
import { readFileSync, writeFileSync } from "fs"
import { createRequire } from "module"
import { fileURLToPath } from "url"
import { dirname, join } from "path"
import { isGuestInviteToken, makeGuestInviteToken } from "../lib/guest-invite-token"

const require = createRequire(import.meta.url)
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
const { getFirestore } = require("firebase-admin/firestore")

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

type MappingRow = {
  oldId: string
  newId: string
  weddingId: string
}

async function main() {
  const db = getFirestore()
  const snap = await db.collection("guests").get()
  const toMigrate = snap.docs.filter((d: { id: string }) => !isGuestInviteToken(d.id))

  console.log(`Guests scanned: ${snap.size}`)
  console.log(`Legacy tokens to rewrite: ${toMigrate.length}`)
  console.log(`Already UUID: ${snap.size - toMigrate.length}`)

  if (toMigrate.length === 0) {
    console.log("Nothing to migrate. Existing UUID invite links are unchanged.")
    return
  }

  const mapping: MappingRow[] = []
  let batch = db.batch()
  let ops = 0
  const commitIfNeeded = async (force = false) => {
    if (ops === 0) return
    if (!force && ops < 400) return
    await batch.commit()
    batch = db.batch()
    ops = 0
  }

  for (const docSnap of toMigrate) {
    const newId = makeGuestInviteToken()
    const data = docSnap.data() as Record<string, unknown>
    const weddingId = String(data.weddingId ?? "")
    batch.set(db.collection("guests").doc(newId), {
      ...data,
      inviteToken: newId,
    })
    batch.delete(docSnap.ref)
    ops += 2
    mapping.push({ oldId: docSnap.id, newId, weddingId })
    await commitIfNeeded()
  }
  await commitIfNeeded(true)

  const outPath = join(root, ".staging-guest-token-migration.json")
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        migratedAt: new Date().toISOString(),
        project: sa.project_id,
        note: "Previous invite URLs using oldId are invalidated. Use newId.",
        count: mapping.length,
        mapping,
      },
      null,
      2
    )
  )

  const byWedding = new Map<string, number>()
  for (const row of mapping) {
    byWedding.set(row.weddingId, (byWedding.get(row.weddingId) ?? 0) + 1)
  }

  console.log("Migration complete. Old invite links are invalidated.")
  console.log("Per-wedding counts:")
  for (const [weddingId, count] of [...byWedding.entries()].sort()) {
    console.log(`  ${weddingId || "(missing weddingId)"}: ${count}`)
  }
  console.log(`Wrote mapping (${mapping.length} rows) to ${outPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
