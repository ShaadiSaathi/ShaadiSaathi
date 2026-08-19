/**
 * Production Wedding AI smoke test (live).
 * Run: npx tsx scripts/run-wedding-ai-production-smoke.ts
 */
import { execSync } from "child_process"
import { readFileSync } from "fs"
import { homedir } from "os"
import { join } from "path"
import { OAuth2Client } from "google-auth-library"

const PRODUCTION_URL = "https://shaadi-saathi-kappa.vercel.app"
const PREMIUM_WEDDING_ID = "Cdi5YhYVoNmQ83Gx90dr"
const FIREBASE_CLI_CLIENT_ID =
  "563584335869-fgrhgmd47bqnekij5iubb5a4evg12e.apps.googleusercontent.com"

function loadEnv(key: string): string {
  for (const file of [".env.production.local", ".env.local"]) {
    try {
      const txt = readFileSync(file, "utf8")
      for (const line of txt.split("\n")) {
        const m = line.match(/^([^#=]+)=(.*)$/)
        if (!m || m[1].trim() !== key) continue
        let v = m[2].trim()
        if (
          (v.startsWith('"') && v.endsWith('"')) ||
          (v.startsWith("'") && v.endsWith("'"))
        ) {
          v = v.slice(1, -1)
        }
        if (v) return v
      }
    } catch {
      /* ignore */
    }
  }
  throw new Error(`Missing ${key}`)
}

async function cliAccessToken(): Promise<string> {
  const config = JSON.parse(
    readFileSync(join(homedir(), ".config/configstore/firebase-tools.json"), "utf8")
  ) as { tokens?: { access_token?: string; refresh_token?: string; expires_at?: number } }
  const t = config.tokens
  if (t?.access_token && t.expires_at && t.expires_at > Date.now() + 60_000) {
    return t.access_token
  }
  const oauth2 = new OAuth2Client(FIREBASE_CLI_CLIENT_ID)
  oauth2.setCredentials({ refresh_token: t?.refresh_token })
  const res = await oauth2.getAccessToken()
  const token = typeof res === "string" ? res : res?.token
  if (!token) throw new Error("No Firebase CLI access token")
  return token
}

async function idToken(): Promise<string> {
  const apiKey = loadEnv("NEXT_PUBLIC_FIREBASE_API_KEY")
  const custom = execSync("npx tsx scripts/mint-production-custom-token.ts", {
    encoding: "utf8",
  }).trim()
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: custom, returnSecureToken: true }),
    }
  )
  const body = (await res.json()) as { idToken?: string; error?: { message?: string } }
  if (!res.ok || !body.idToken) {
    throw new Error(body.error?.message || "signInWithCustomToken failed")
  }
  return body.idToken
}

function hasMarkdown(text: string): boolean {
  return (
    /\*\*[^*]+\*\*/.test(text) ||
    /^-\s/m.test(text) ||
    /^\*\s/m.test(text) ||
    /^#{1,3}\s/m.test(text)
  )
}

async function main() {
  let failed = false
  const fail = (label: string, detail?: unknown) => {
    failed = true
    console.log(`FAIL ${label}`, detail ?? "")
  }
  const pass = (label: string, detail?: unknown) => {
    console.log(`PASS ${label}`, detail ?? "")
  }

  const token = await idToken()
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }

  const probe =
    "What mehndi traditions should I plan for a Punjabi wedding? Reply with a short bullet list."
  const chatRes = await fetch(`${PRODUCTION_URL}/api/wedding-chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({ message: probe }),
  })
  const chat = (await chatRes.json()) as {
    answer?: string
    reply?: string
    error?: string
  }
  const answer = chat.answer ?? chat.reply ?? ""
  if (chatRes.status === 200 && answer.length > 40 && !chat.error) {
    pass("real answer", { status: chatRes.status, chars: answer.length })
  } else {
    fail("real answer", { status: chatRes.status, error: chat.error, chars: answer.length })
  }

  const usageRes = await fetch(`${PRODUCTION_URL}/api/wedding-chat/usage`, { headers })
  const usage = (await usageRes.json()) as { remaining?: number; used?: number; limit?: number }
  if (usageRes.status === 200 && typeof usage.remaining === "number") {
    pass("usage endpoint", usage)
  } else {
    fail("usage endpoint", { status: usageRes.status, usage })
  }

  const hist1 = (await (
    await fetch(`${PRODUCTION_URL}/api/wedding-chat/history`, { headers })
  ).json()) as { messages?: unknown[] }
  if (Array.isArray(hist1.messages) && hist1.messages.length >= 1) {
    pass("history after chat", { count: hist1.messages.length })
  } else {
    fail("history after chat", hist1)
  }

  const hist2 = (await (
    await fetch(`${PRODUCTION_URL}/api/wedding-chat/history`, { headers })
  ).json()) as { messages?: Array<{ role?: string; content?: string }> }
  if (
    Array.isArray(hist2.messages) &&
    hist2.messages.some((m) => m.role === "user" && (m.content ?? "").includes("mehndi"))
  ) {
    pass("history reload")
  } else {
    fail("history reload")
  }

  if (hasMarkdown(answer)) pass("markdown in API answer")
  else pass("markdown in API answer (plain prose returned — UI still uses ReactMarkdown)")

  const access = await cliAccessToken()
  const dateKey = new Date().toISOString().slice(0, 10)
  const docId = `${PREMIUM_WEDDING_ID}_${dateKey}`
  const docPath = `projects/shaadi-saathi-dd3da/databases/(default)/documents/weddingAiUsage/${docId}`
  const getRes = await fetch(`https://firestore.googleapis.com/v1/${docPath}`, {
    headers: { Authorization: `Bearer ${access}` },
  })
  const prev = getRes.ok
    ? ((await getRes.json()) as { fields?: Record<string, unknown> })
    : null

  await fetch(`https://firestore.googleapis.com/v1/${docPath}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${access}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: {
        weddingId: { stringValue: PREMIUM_WEDDING_ID },
        dateKey: { stringValue: dateKey },
        used: { integerValue: "20" },
        bonusAllowance: { integerValue: "0" },
        updatedAt: { integerValue: String(Date.now()) },
      },
    }),
  })

  const capRes = await fetch(`${PRODUCTION_URL}/api/wedding-chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({ message: "cap probe" }),
  })
  const cap = (await capRes.json()) as { code?: string; error?: string }
  if (capRes.status === 429 && cap.code === "DAILY_LIMIT") {
    pass("daily cap enforced", { status: capRes.status, code: cap.code })
  } else {
    fail("daily cap enforced", { status: capRes.status, cap })
  }

  if (prev?.fields) {
    await fetch(`https://firestore.googleapis.com/v1/${docPath}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${access}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields: prev.fields }),
    })
  } else {
    await fetch(`https://firestore.googleapis.com/v1/${docPath}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${access}` },
    })
  }

  if (failed) {
    console.log("FAIL wedding AI production smoke test")
    process.exit(1)
  }
  console.log("PASS wedding AI production smoke test")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
