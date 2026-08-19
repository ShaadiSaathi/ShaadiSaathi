/**
 * Production guest token migration using Firebase CLI OAuth credentials
 * (when FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON is unavailable locally).
 *
 * Run:
 *   CONFIRM_PRODUCTION_GUEST_TOKEN_MIGRATION=yes npx tsx scripts/migrate-production-guest-invite-tokens-cli.ts
 */
import { existsSync, readFileSync, writeFileSync } from "fs"
import { homedir } from "os"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { OAuth2Client } from "google-auth-library"
import { isGuestInviteToken, makeGuestInviteToken } from "../lib/guest-invite-token"

const PRODUCTION_PROJECT_ID = "shaadi-saathi-dd3da"
const FIREBASE_CLI_CLIENT_ID =
  "563584335869-fgrhgmd47bqnekij5iubb5a4evg12e.apps.googleusercontent.com"
const root = join(dirname(fileURLToPath(import.meta.url)), "..")

if (process.env.CONFIRM_PRODUCTION_GUEST_TOKEN_MIGRATION !== "yes") {
  console.error(
    "ABORT: set CONFIRM_PRODUCTION_GUEST_TOKEN_MIGRATION=yes to rewrite production guest tokens."
  )
  process.exit(2)
}

function loadFirebaseCliTokens(): { accessToken?: string; refreshToken?: string; expiresAt?: number } {
  const path = join(homedir(), ".config/configstore/firebase-tools.json")
  if (!existsSync(path)) {
    throw new Error("Firebase CLI not logged in — run firebase login first.")
  }
  const config = JSON.parse(readFileSync(path, "utf8")) as {
    tokens?: { access_token?: string; refresh_token?: string; expires_at?: number }
  }
  return {
    accessToken: config.tokens?.access_token,
    refreshToken: config.tokens?.refresh_token,
    expiresAt: config.tokens?.expires_at,
  }
}

async function getAccessToken(): Promise<string> {
  const cli = loadFirebaseCliTokens()
  if (cli.accessToken && cli.expiresAt && cli.expiresAt > Date.now() + 60_000) {
    return cli.accessToken
  }
  if (!cli.refreshToken) {
    throw new Error("No Firebase CLI tokens found — run firebase login first.")
  }
  const oauth2 = new OAuth2Client(FIREBASE_CLI_CLIENT_ID)
  oauth2.setCredentials({ refresh_token: cli.refreshToken })
  const res = await oauth2.getAccessToken()
  const token = typeof res === "string" ? res : res?.token
  if (!token) throw new Error("Failed to obtain Firebase CLI access token.")
  return token
}

type FirestoreDoc = { name?: string; fields?: Record<string, unknown> }

function decodeValue(value: Record<string, unknown>): unknown {
  if ("stringValue" in value) return value.stringValue
  if ("integerValue" in value) return Number(value.integerValue)
  if ("doubleValue" in value) return value.doubleValue
  if ("booleanValue" in value) return value.booleanValue
  if ("nullValue" in value) return null
  if ("arrayValue" in value) {
    const arr = value.arrayValue as { values?: Record<string, unknown>[] }
    return (arr.values ?? []).map((v) => decodeValue(v))
  }
  if ("mapValue" in value) {
    const map = value.mapValue as { fields?: Record<string, Record<string, unknown>> }
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(map.fields ?? {})) {
      out[k] = decodeValue(v)
    }
    return out
  }
  return null
}

function encodeValue(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) return { nullValue: "NULL_VALUE" }
  if (typeof value === "string") return { stringValue: value }
  if (typeof value === "boolean") return { booleanValue: value }
  if (typeof value === "number") {
    if (Number.isInteger(value)) return { integerValue: String(value) }
    return { doubleValue: value }
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map((v) => encodeValue(v)) } }
  }
  if (typeof value === "object") {
    const fields: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      fields[k] = encodeValue(v)
    }
    return { mapValue: { fields } }
  }
  return { stringValue: String(value) }
}

async function listGuestDocs(token: string): Promise<FirestoreDoc[]> {
  const base = `https://firestore.googleapis.com/v1/projects/${PRODUCTION_PROJECT_ID}/databases/(default)/documents/guests`
  const docs: FirestoreDoc[] = []
  let pageToken: string | undefined
  do {
    const url = new URL(base)
    url.searchParams.set("pageSize", "500")
    if (pageToken) url.searchParams.set("pageToken", pageToken)
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`List guests failed: ${res.status} ${await res.text()}`)
    const body = (await res.json()) as { documents?: FirestoreDoc[]; nextPageToken?: string }
    docs.push(...(body.documents ?? []))
    pageToken = body.nextPageToken
  } while (pageToken)
  return docs
}

async function commitWrites(
  token: string,
  writes: Array<{ type: "create" | "delete"; docPath: string; fields?: Record<string, unknown> }>
) {
  const url = `https://firestore.googleapis.com/v1/projects/${PRODUCTION_PROJECT_ID}/databases/(default)/documents:commit`
  const firestoreWrites = writes.map((w) => {
    if (w.type === "delete") {
      return { delete: w.docPath }
    }
    return {
      update: {
        name: w.docPath,
        fields: w.fields,
      },
      updateMask: { fieldPaths: [] },
      currentDocument: { exists: false },
    }
  })
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ writes: firestoreWrites }),
  })
  if (!res.ok) throw new Error(`Commit failed: ${res.status} ${await res.text()}`)
}

async function main() {
  const token = await getAccessToken()
  const docs = await listGuestDocs(token)
  const legacy = docs.filter((d) => {
    const id = d.name?.split("/").pop() ?? ""
    return !isGuestInviteToken(id)
  })

  console.log(`Project: ${PRODUCTION_PROJECT_ID}`)
  console.log(`Guests scanned: ${docs.length}`)
  console.log(`Legacy tokens to rewrite: ${legacy.length}`)
  console.log(`Already UUID: ${docs.length - legacy.length}`)

  if (legacy.length === 0) {
    console.log("Nothing to migrate.")
    return
  }

  const mapping: Array<{ oldId: string; newId: string; weddingId: string }> = []
  const writes: Array<{ type: "create" | "delete"; docPath: string; fields?: Record<string, unknown> }> = []

  for (const doc of legacy) {
    const oldId = doc.name!.split("/").pop()!
    const newId = makeGuestInviteToken()
    const plain: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(doc.fields ?? {})) {
      plain[k] = decodeValue(v as Record<string, unknown>)
    }
    plain.inviteToken = newId
    const weddingId = String(plain.weddingId ?? "")
    mapping.push({ oldId, newId, weddingId })
    const newPath = `projects/${PRODUCTION_PROJECT_ID}/databases/(default)/documents/guests/${newId}`
    const oldPath = doc.name!
    const encoded: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(plain)) {
      encoded[k] = encodeValue(v)
    }
    writes.push({ type: "create", docPath: newPath, fields: encoded })
    writes.push({ type: "delete", docPath: oldPath })
  }

  // Firestore commit limit is 500 ops; we have <= 34 ops for 17 guests
  await commitWrites(token, writes)

  const outPath = join(root, ".production-guest-token-migration.json")
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        migratedAt: new Date().toISOString(),
        project: PRODUCTION_PROJECT_ID,
        note: "Previous invite URLs using oldId are invalidated. Use newId.",
        count: mapping.length,
        mapping,
      },
      null,
      2
    )
  )

  console.log(`Migration complete. Rewrote ${mapping.length} guest docs.`)
  console.log(`Wrote mapping to ${outPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
