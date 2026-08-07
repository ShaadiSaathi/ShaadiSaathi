/**
 * Research pipeline for the wedding knowledge base.
 *
 * Usage:
 *   npx tsx scripts/research-knowledge-base.ts
 *   npx tsx scripts/research-knowledge-base.ts --query "mehndi colours pakistan"
 *
 * Process (human + agent):
 * 1. Pick a TraditionCategory that is not yet in `populated`.
 * 2. Web-search credible industry / cultural sources (not paywalled).
 * 3. Summarize in your own words into WeddingKnowledgeEntry shape.
 * 4. Attach sourceUrls with reliability + accessedAt.
 * 5. Flag forum-only claims with trendsByYear.anecdotal = true.
 * 6. Save JSON under lib/knowledge/data/{category}.json and register in index.ts.
 * 7. Re-run this script to validate schema + run a naive retrieval smoke test.
 *
 * Do NOT paste verbatim article text. Respect robots.txt / ToS; skip paywalls.
 */

import { readFileSync } from "fs"
import { resolve } from "path"
import type { KnowledgeBaseManifest, WeddingKnowledgeEntry } from "../lib/knowledge/types"
import {
  getPopulatedCategories,
  listKnowledgeEntries,
  searchKnowledgeNaive,
} from "../lib/knowledge"

const REQUIRED_ENTRY_KEYS: (keyof WeddingKnowledgeEntry)[] = [
  "id",
  "tradition",
  "region",
  "community",
  "ceremonyEvents",
  "decorThemes",
  "colorPalettes",
  "floralConventions",
  "lightingConventions",
  "seatingSetups",
  "commonVendors",
  "trendsByYear",
  "notes",
  "sourceUrls",
]

function assertEntry(entry: WeddingKnowledgeEntry, path: string): string[] {
  const errors: string[] = []
  for (const key of REQUIRED_ENTRY_KEYS) {
    if (entry[key] === undefined || entry[key] === null) {
      errors.push(`${path}: missing ${key}`)
    }
  }
  if (!entry.sourceUrls?.length) {
    errors.push(`${path}: sourceUrls must not be empty`)
  }
  for (const src of entry.sourceUrls ?? []) {
    if (!src.url?.startsWith("http")) {
      errors.push(`${path}: invalid source url ${src.url}`)
    }
    if (!["authoritative", "industry", "anecdotal"].includes(src.reliability)) {
      errors.push(`${path}: bad reliability on ${src.url}`)
    }
  }
  if (!entry.ceremonyEvents?.length) {
    errors.push(`${path}: ceremonyEvents empty`)
  }
  return errors
}

function validateFile(relativePath: string): string[] {
  const abs = resolve(process.cwd(), relativePath)
  const raw = JSON.parse(readFileSync(abs, "utf8")) as KnowledgeBaseManifest
  const errors: string[] = []
  if (!raw.version) errors.push(`${relativePath}: missing version`)
  if (!raw.entries?.length) errors.push(`${relativePath}: no entries`)
  raw.entries?.forEach((e, i) => {
    errors.push(...assertEntry(e, `${relativePath}[${i}] (${e.id})`))
  })
  return errors
}

function main() {
  const queryArgIdx = process.argv.indexOf("--query")
  const query =
    queryArgIdx >= 0 ? process.argv.slice(queryArgIdx + 1).join(" ") : ""

  console.log("Wedding KB research pipeline")
  console.log("Populated categories:", getPopulatedCategories().join(", ") || "(none)")
  console.log("Entry count:", listKnowledgeEntries().length)

  const errors = validateFile("lib/knowledge/data/south-asian.json")
  if (errors.length) {
    console.error("Validation failed:")
    for (const e of errors) console.error(" -", e)
    process.exit(1)
  }
  console.log("Validation: OK")

  const sampleQuery = query || "Pakistani mehndi decoration colours yellow"
  const hits = searchKnowledgeNaive(sampleQuery, 3)
  console.log(`\nNaive retrieval for: "${sampleQuery}"`)
  for (const hit of hits) {
    console.log(` - ${hit.id} · ${hit.region} · ${hit.ceremonyEvents.length} events`)
    console.log(`   sources: ${hit.sourceUrls.map((s) => s.title).join("; ")}`)
  }

  // Pretty-print one entry summary for human review (POC deliverable)
  const pak = listKnowledgeEntries().find((e) => e.id === "sa-pakistani-muslim")
  if (pak) {
    console.log("\n--- POC preview: sa-pakistani-muslim ---")
    console.log(
      JSON.stringify(
        {
          id: pak.id,
          tradition: pak.tradition,
          region: pak.region,
          ceremonyEvents: pak.ceremonyEvents.map((c) => ({
            order: c.order,
            name: c.name,
            timing: c.timing,
          })),
          colorPalettes: pak.colorPalettes.map((p) => p.name),
          decorThemes: pak.decorThemes.map((d) => d.name),
          commonVendors: pak.commonVendors.map((v) => v.label),
          sourceCount: pak.sourceUrls.length,
        },
        null,
        2
      )
    )
  }
}

main()
