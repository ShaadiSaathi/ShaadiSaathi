/**
 * One-off: chunk South Asian KB → upsert into Upstash Vector.
 *
 * Prerequisites:
 * 1. Create an Upstash Vector index WITH a built-in embedding model
 *    (recommended: BGE Small EN / BAAI/bge-small-en-v1.5) so upserts can use
 *    raw `data` strings. Do NOT use a custom-dimension-only index unless you
 *    also add an external embedding provider.
 * 2. Set in env (or .env.local):
 *      UPSTASH_VECTOR_REST_URL=
 *      UPSTASH_VECTOR_REST_TOKEN=
 *
 * Usage:
 *   npx tsx scripts/embed-knowledge-base.ts
 *
 * Safe to re-run — upserts overwrite the same chunk IDs.
 */

import { readFileSync, existsSync } from "fs"
import { resolve } from "path"
import { chunkAllEntries } from "../lib/knowledge/chunks"
import {
  chunkToUpsertPayload,
  getKnowledgeVectorIndex,
  isVectorConfigured,
  getUpstashRestUrl,
} from "../lib/knowledge/vector"
import type { KnowledgeBaseManifest } from "../lib/knowledge/types"

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local")
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (!m) continue
    const key = m[1].trim()
    let val = m[2].trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

async function main() {
  loadEnvLocal()

  if (!isVectorConfigured()) {
    console.error(
      "Missing UPSTASH_VECTOR_REST_URL or UPSTASH_VECTOR_REST_TOKEN.\n" +
        "Create an Upstash Vector index with an embedding model, then set both env vars."
    )
    process.exit(1)
  }

  const index = getKnowledgeVectorIndex()
  if (!index) {
    console.error("Could not create Upstash index client")
    process.exit(1)
  }

  const manifestPath = resolve(
    process.cwd(),
    "lib/knowledge/data/south-asian.json"
  )
  const manifest = JSON.parse(
    readFileSync(manifestPath, "utf8")
  ) as KnowledgeBaseManifest

  const chunks = chunkAllEntries(manifest.entries)
  console.log(
    `Chunked ${manifest.entries.length} entries → ${chunks.length} vectors`
  )

  const batchSize = 20
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize).map(chunkToUpsertPayload)
    await index.upsert(batch)
    console.log(
      `Upserted ${Math.min(i + batchSize, chunks.length)} / ${chunks.length}`
    )
  }

  console.log("Done. Sample IDs:")
  for (const c of chunks.slice(0, 5)) {
    console.log(` - ${c.id}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
