/**
 * Production-only: verify guest invite tokens are random UUIDs.
 * Run: npx tsx scripts/test-guest-invite-tokens-production.ts
 */
import { existsSync, readFileSync } from "fs"
import { createRequire } from "module"
import { homedir } from "os"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
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
const adminRaw = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON?.trim()
if (!adminRaw || adminRaw === '""' || adminRaw === "''") {
  delete process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON
}

const { OAuth2Client } = require("google-auth-library")
const FIREBASE_CLI_CLIENT_ID =
  "563584335869-fgrhgmd47bqnekij5iubb5a4evg12e.apps.googleusercontent.com"

async function getAccessToken(): Promise<string> {
  const path = join(homedir(), ".config/configstore/firebase-tools.json")
  const config = JSON.parse(readFileSync(path, "utf8")) as {
    tokens?: { access_token?: string; refresh_token?: string; expires_at?: number }
  }
  const tokens = config.tokens
  if (tokens?.access_token && tokens.expires_at && tokens.expires_at > Date.now() + 60_000) {
    return tokens.access_token
  }
  const oauth2 = new OAuth2Client(FIREBASE_CLI_CLIENT_ID)
  oauth2.setCredentials({ refresh_token: tokens?.refresh_token })
  const res = await oauth2.getAccessToken()
  const token = typeof res === "string" ? res : res?.token
  if (!token) throw new Error("Failed to obtain access token")
  return token
}

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

async function docExists(token: string, docId: string): Promise<boolean> {
  const url = `https://firestore.googleapis.com/v1/projects/${PRODUCTION_PROJECT_ID}/databases/(default)/documents/guests/${encodeURIComponent(docId)}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  return res.ok
}

async function main() {
  const access = await getAccessToken()
  const listUrl = `https://firestore.googleapis.com/v1/projects/${PRODUCTION_PROJECT_ID}/databases/(default)/documents/guests?pageSize=500`
  const res = await fetch(listUrl, { headers: { Authorization: `Bearer ${access}` } })
  if (!res.ok) throw new Error(`List failed: ${res.status}`)
  const body = (await res.json()) as { documents?: Array<{ name: string; fields?: Record<string, unknown> }> }
  const docs = body.documents ?? []
  const legacy = docs.filter((d) => !isGuestInviteToken(d.name.split("/").pop() ?? ""))

  console.log(`Project: ${PRODUCTION_PROJECT_ID}`)
  console.log(`Guests scanned: ${docs.length}`)
  console.log(`Legacy doc ids: ${legacy.length}`)

  if (legacy.length > 0) {
    console.error("FAIL: legacy guest doc ids remain")
    process.exit(1)
  }
  console.log("ok  all production guest doc ids are UUID v4")

  // Spot-check reconstructed FNV tokens against known guest names
  const names = new Set<string>()
  for (const d of docs) {
    const nameField = d.fields?.name as { stringValue?: string } | undefined
    const weddingField = d.fields?.weddingId as { stringValue?: string } | undefined
    if (nameField?.stringValue && weddingField?.stringValue) {
      names.add(`${weddingField.stringValue}:${nameField.stringValue}`)
    }
  }

  let hits = 0
  for (const key of names) {
    const [weddingId, name] = key.split(":")
    const guess = legacyFnvInviteToken(weddingId, name)
    if (await docExists(access, guess)) hits++
  }
  if (hits > 0) {
    console.error(`FAIL: ${hits} reconstructed FNV tokens still resolve`)
    process.exit(1)
  }
  console.log("ok  reconstructed FNV tokens do not resolve")

  console.log("PASS guest invite token security (production)")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
