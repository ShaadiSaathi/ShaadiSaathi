/**
 * Read-only SMS / Auth / App Check diagnostics for shaadi-saathi-dd3da.
 * Uses firebase-tools OAuth; never prints tokens.
 */
import https from "https"
import { createRequire } from "module"
import { createRequire as createRequire2 } from "module"
import { existsSync } from "fs"
import { homedir } from "os"
import { join } from "path"
import { execSync } from "child_process"

function resolveFirebaseToolsAuth() {
  const candidates = []
  try {
    const npxRoot = execSync("ls -dt ~/.npm/_npx/*/node_modules/firebase-tools 2>/dev/null | head -1", {
      encoding: "utf8",
      shell: "/bin/zsh",
    }).trim()
    if (npxRoot) candidates.push(join(npxRoot, "lib/auth.js"))
  } catch {
    // ignore
  }
  candidates.push(join(homedir(), ".npm/_npx/ba4f1959e38407b5/node_modules/firebase-tools/lib/auth.js"))
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  throw new Error("firebase-tools auth module not found; run: npx firebase-tools --version")
}

const require = createRequire(import.meta.url)
const auth = require(resolveFirebaseToolsAuth())

const PROJECT = "shaadi-saathi-dd3da"

function getJson(url, accessToken) {
  return new Promise((resolve) => {
    const req = https.request(
      url,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      },
      (res) => {
        let raw = ""
        res.on("data", (c) => (raw += c))
        res.on("end", () => {
          let json = null
          try {
            json = JSON.parse(raw)
          } catch {
            // keep raw
          }
          resolve({ status: res.statusCode, json, raw: raw.slice(0, 2000) })
        })
      }
    )
    req.on("error", (err) => resolve({ status: 0, error: String(err) }))
    req.end()
  })
}

function summarizePhone(doc) {
  return {
    phone: doc.phone ?? null,
    flow: doc.flow ?? null,
    stage: doc.stage ?? null,
    code: doc.code ?? null,
    rawCode: doc.rawCode ?? null,
    rawMessage: (doc.rawMessage ?? "").slice(0, 160) || null,
    verificationId: doc.verificationId
      ? String(doc.verificationId).slice(0, 24)
      : null,
    hasVerificationId: doc.hasVerificationId ?? null,
    channel: doc.channel ?? null,
    timestamp: doc.timestamp ?? null,
    iso:
      typeof doc.timestamp === "number"
        ? new Date(doc.timestamp).toISOString()
        : null,
  }
}

async function listCollection(accessToken, collection, limit = 30) {
  // Firestore REST: runQuery ordered by timestamp desc
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`
  const body = JSON.stringify({
    structuredQuery: {
      from: [{ collectionId: collection }],
      orderBy: [{ field: { fieldPath: "timestamp" }, direction: "DESCENDING" }],
      limit,
    },
  })

  return new Promise((resolve) => {
    const req = https.request(
      url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
      (res) => {
        let raw = ""
        res.on("data", (c) => (raw += c))
        res.on("end", () => {
          let json = null
          try {
            json = JSON.parse(raw)
          } catch {
            // ignore
          }
          resolve({ status: res.statusCode, json, raw: raw.slice(0, 1500) })
        })
      }
    )
    req.on("error", (err) => resolve({ status: 0, error: String(err) }))
    req.write(body)
    req.end()
  })
}

function firestoreValueToJs(v) {
  if (!v || typeof v !== "object") return null
  if ("stringValue" in v) return v.stringValue
  if ("integerValue" in v) return Number(v.integerValue)
  if ("doubleValue" in v) return v.doubleValue
  if ("booleanValue" in v) return v.booleanValue
  if ("nullValue" in v) return null
  if ("timestampValue" in v) return v.timestampValue
  if ("mapValue" in v) {
    const out = {}
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) {
      out[k] = firestoreValueToJs(val)
    }
    return out
  }
  return v
}

function docsFromRunQuery(result) {
  if (!Array.isArray(result.json)) return []
  return result.json
    .map((row) => row.document)
    .filter(Boolean)
    .map((doc) => {
      const fields = {}
      for (const [k, v] of Object.entries(doc.fields || {})) {
        fields[k] = firestoreValueToJs(v)
      }
      return { id: doc.name?.split("/").pop(), ...fields }
    })
}

async function main() {
  const account = await auth.getGlobalDefaultAccount()
  if (!account) {
    console.error("NO_FIREBASE_LOGIN")
    process.exit(2)
  }
  const tokens = await auth.getAccessToken(account.tokens.refresh_token, [])
  const at = tokens.access_token
  if (!at) {
    console.error("NO_ACCESS_TOKEN")
    process.exit(2)
  }

  const report = {
    project: PROJECT,
    fetchedAt: new Date().toISOString(),
  }

  report.identityToolkitConfig = await getJson(
    `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT}/config`,
    at
  )

  report.appCheckServices = await getJson(
    `https://firebaseappcheck.googleapis.com/v1/projects/${PROJECT}/services`,
    at
  )

  report.webApps = await getJson(
    `https://firebase.googleapis.com/v1beta1/projects/${PROJECT}/webApps`,
    at
  )

  const appCheckPerApp = []
  if (report.webApps.status < 400 && report.webApps.json?.apps) {
    for (const app of report.webApps.json.apps) {
      const appId = app.appId
      const cfg = await getJson(
        `https://firebaseappcheck.googleapis.com/v1/projects/${PROJECT}/apps/${appId}`,
        at
      )
      appCheckPerApp.push({
        appId,
        displayName: app.displayName,
        status: cfg.status,
        data:
          cfg.status < 400
            ? {
                name: cfg.json?.name,
                // omit secrets; only show enforcement-ish fields if present
                tokenTtl: cfg.json?.tokenTtl,
              }
            : cfg.json || cfg.raw,
      })
    }
  }
  report.appCheckPerApp = appCheckPerApp

  const success = await listCollection(at, "verification_success", 40)
  const errors = await listCollection(at, "verification_errors", 40)
  report.verification_success = {
    status: success.status,
    count: Array.isArray(success.json)
      ? docsFromRunQuery(success).length
      : null,
    docs: docsFromRunQuery(success).map(summarizePhone),
    error: success.status >= 400 ? success.json || success.raw : null,
  }
  report.verification_errors = {
    status: errors.status,
    count: Array.isArray(errors.json) ? docsFromRunQuery(errors).length : null,
    docs: docsFromRunQuery(errors).map(summarizePhone),
    error: errors.status >= 400 ? errors.json || errors.raw : null,
  }

  // Pull only the Auth fields we care about from Identity Toolkit config
  const cfg = report.identityToolkitConfig.json || {}
  report.authSummary = {
    status: report.identityToolkitConfig.status,
    smsRegionConfig: cfg.smsRegionConfig || cfg.sms_region_config || null,
    signIn: cfg.signIn
      ? {
          phoneNumber: cfg.signIn.phoneNumber || cfg.signIn.phone_number || null,
          email: cfg.signIn.email ? { enabled: cfg.signIn.email.enabled } : null,
        }
      : null,
    recaptchaConfig: cfg.recaptchaConfig
      ? {
          emailPasswordEnforcementState:
            cfg.recaptchaConfig.emailPasswordEnforcementState,
          phoneEnforcementState: cfg.recaptchaConfig.phoneEnforcementState,
        }
      : null,
    blockingFunctions: cfg.blockingFunctions ? "present" : null,
  }

  // Avoid dumping full Identity Toolkit blob (can be large)
  delete report.identityToolkitConfig.json
  report.identityToolkitConfig.note =
    "Full config omitted; see authSummary.smsRegionConfig"

  console.log(JSON.stringify(report, null, 2))
}

main().catch((err) => {
  console.error("FAILED", err && err.message ? err.message : String(err))
  process.exit(1)
})
