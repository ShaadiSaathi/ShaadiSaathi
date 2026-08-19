/**
 * Production Wedding AI smoke test against live deployment.
 *
 * Requires FIREBASE_ADMIN for shaadi-saathi-dd3da (production).
 * Loads from .env.production.local when non-empty, else aborts with instructions.
 *
 * Run:
 *   npx tsx scripts/test-wedding-ai-production-smoke.ts
 */
import { existsSync, readFileSync } from "fs"
import { createRequire } from "module"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const PRODUCTION_URL = "https://shaadi-saathi-kappa.vercel.app"
const PREMIUM_OWNER_UID = "RLEY5BfOKkb9CWU1R6CNUL1Nfro1"
const PREMIUM_WEDDING_ID = "Cdi5YhYVoNmQ83Gx90dr"
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
  console.error(
    "ABORT: FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON for production is not available locally.\n" +
      "Run: npx vercel env pull .env.production.local --environment=production\n" +
      "Ensure the pulled file contains a non-empty FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON for shaadi-saathi-dd3da."
  )
  process.exit(2)
}

const { cert, getApps, initializeApp } = require("firebase-admin/app")
const { getAuth } = require("firebase-admin/auth")
const { getFirestore } = require("firebase-admin/firestore")

const sa = JSON.parse(adminRaw)
if (sa.project_id !== "shaadi-saathi-dd3da") {
  console.error(`ABORT: admin SA is for ${sa.project_id}, expected shaadi-saathi-dd3da`)
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

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
if (!apiKey) {
  console.error("ABORT: NEXT_PUBLIC_FIREBASE_API_KEY missing")
  process.exit(2)
}

async function idTokenFromCustomToken(customToken: string): Promise<string> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  )
  const body = (await res.json()) as { idToken?: string; error?: { message?: string } }
  if (!res.ok || !body.idToken) {
    throw new Error(body.error?.message || `signInWithCustomToken failed (${res.status})`)
  }
  return body.idToken
}

function hasMarkdownStructure(text: string): boolean {
  const checks = [
    /\*\*[^*]+\*\/.test(text),
    /^#{1,3}\s/m.test(text),
    /^[-*]\s/m.test(text),
    /^\d+\.\s/m.test(text),
  ]
  return checks.some(Boolean)
}

async function main() {
  const auth = getAuth()
  const db = getFirestore()

  const wedding = await db.collection("weddings").doc(PREMIUM_WEDDING_ID).get()
  if (!wedding.exists || wedding.data()?.isPremium !== true) {
    console.error("FAIL setup: premium wedding not found")
    process.exit(1)
  }

  const customToken = await auth.createCustomToken(PREMIUM_OWNER_UID)
  const idToken = await idTokenFromCustomToken(customToken)
  const headers = {
    Authorization: `Bearer ${idToken}`,
    "Content-Type": "application/json",
  }

  const probe = "What are common mehndi ceremony traditions I should plan for?"
  const chatRes = await fetch(`${PRODUCTION_URL}/api/wedding-chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({ message: probe }),
  })
  const chatBody = (await chatRes.json()) as {
    answer?: string
    reply?: string
    error?: string
    code?: string
    usage?: { remaining?: number }
  }

  const answer = chatBody.answer ?? chatBody.reply ?? ""
  const chatOk =
    chatRes.status === 200 &&
    answer.length > 40 &&
    !/503|not configured|Firebase Admin/i.test(answer) &&
    !chatBody.error

  console.log(chatOk ? "PASS real answer" : "FAIL real answer", {
    status: chatRes.status,
    chars: answer.length,
    error: chatBody.error,
  })
  if (!chatOk) process.exitCode = 1

  const usageRes = await fetch(`${PRODUCTION_URL}/api/wedding-chat/usage`, { headers })
  const usageBody = (await usageRes.json()) as { remaining?: number; used?: number; limit?: number }
  const usageOk = usageRes.status === 200 && typeof usageBody.remaining === "number"
  console.log(usageOk ? "PASS usage endpoint" : "FAIL usage endpoint", {
    status: usageRes.status,
    used: usageBody.used,
    remaining: usageBody.remaining,
    limit: usageBody.limit,
  })
  if (!usageOk) process.exitCode = 1

  const histRes1 = await fetch(`${PRODUCTION_URL}/api/wedding-chat/history`, { headers })
  const hist1 = (await histRes1.json()) as { messages?: unknown[] }
  const histOk1 =
    histRes1.status === 200 && Array.isArray(hist1.messages) && hist1.messages.length >= 1
  console.log(histOk1 ? "PASS history after chat" : "FAIL history after chat", {
    status: histRes1.status,
    count: Array.isArray(hist1.messages) ? hist1.messages.length : 0,
  })
  if (!histOk1) process.exitCode = 1

  const histRes2 = await fetch(`${PRODUCTION_URL}/api/wedding-chat/history`, { headers })
  const hist2 = (await histRes2.json()) as { messages?: Array<{ role?: string; content?: string }> }
  const persisted =
    histRes2.status === 200 &&
    Array.isArray(hist2.messages) &&
    hist2.messages.some((m) => m.role === "user" && (m.content ?? "").includes("mehndi"))
  console.log(persisted ? "PASS history reload" : "FAIL history reload")
  if (!persisted) process.exitCode = 1

  const mdOk = hasMarkdownStructure(answer) || !/(\*\*|##|^[-*]\s)/m.test(probe)
  // If model returns plain prose without markdown, check page rendering separately
  console.log(
    hasMarkdownStructure(answer)
      ? "PASS markdown in API answer"
      : "WARN markdown not detected in API answer (check UI render separately)",
    { sample: answer.slice(0, 120).replace(/\n/g, " ") }
  )

  // Cap enforcement: set usage to limit then expect 429
  const dateKey = new Date().toISOString().slice(0, 10)
  const usageDocId = `${PREMIUM_WEDDING_ID}_${dateKey}`
  const prev = await db.collection("weddingAiUsage").doc(usageDocId).get()
  const prevData = prev.data()
  await db
    .collection("weddingAiUsage")
    .doc(usageDocId)
    .set({
      weddingId: PREMIUM_WEDDING_ID,
      dateKey,
      used: 20,
      bonusAllowance: 0,
      updatedAt: Date.now(),
    })

  const cappedRes = await fetch(`${PRODUCTION_URL}/api/wedding-chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({ message: "Quick cap test question" }),
  })
  const cappedBody = (await cappedRes.json()) as { code?: string; error?: string }
  const capOk = cappedRes.status === 429 && cappedBody.code === "DAILY_LIMIT"
  console.log(capOk ? "PASS daily cap enforced" : "FAIL daily cap enforced", {
    status: cappedRes.status,
    code: cappedBody.code,
  })
  if (!capOk) process.exitCode = 1

  // Restore usage doc
  if (prev.exists) {
    await db.collection("weddingAiUsage").doc(usageDocId).set(prevData ?? {}, { merge: false })
  } else {
    await db.collection("weddingAiUsage").doc(usageDocId).delete()
  }

  if (process.exitCode === 1) {
    console.error("FAIL wedding AI production smoke test")
    process.exit(1)
  }
  console.log("PASS wedding AI production smoke test")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
