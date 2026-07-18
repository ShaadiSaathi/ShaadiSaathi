import { cert, getApps, initializeApp, type App } from "firebase-admin/app"
import { getAuth, type Auth } from "firebase-admin/auth"
import { getFirestore, type Firestore } from "firebase-admin/firestore"

let app: App | undefined
let auth: Auth | undefined
let db: Firestore | undefined

function parseServiceAccount(): {
  projectId: string
  clientEmail: string
  privateKey: string
} {
  const raw = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON
  if (!raw?.trim()) {
    throw new Error("FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON is not set")
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error("FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON is not valid JSON")
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON must be an object")
  }

  const obj = parsed as Record<string, unknown>
  const projectId =
    typeof obj.project_id === "string"
      ? obj.project_id
      : typeof obj.projectId === "string"
        ? obj.projectId
        : ""
  const clientEmail =
    typeof obj.client_email === "string"
      ? obj.client_email
      : typeof obj.clientEmail === "string"
        ? obj.clientEmail
        : ""
  let privateKey =
    typeof obj.private_key === "string"
      ? obj.private_key
      : typeof obj.privateKey === "string"
        ? obj.privateKey
        : ""

  // Vercel / env files often store newlines as the literal characters "\n"
  privateKey = privateKey.replace(/\\n/g, "\n")

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON is missing project_id, client_email, or private_key"
    )
  }

  return { projectId, clientEmail, privateKey }
}

export function isFirebaseAdminConfigured(): boolean {
  return Boolean(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON?.trim())
}

function getAdminApp(): App {
  if (app) return app
  if (getApps().length > 0) {
    app = getApps()[0]!
    return app
  }
  const { projectId, clientEmail, privateKey } = parseServiceAccount()
  app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    projectId,
  })
  return app
}

export function getAdminAuth(): Auth {
  if (!auth) auth = getAuth(getAdminApp())
  return auth
}

export function getAdminDb(): Firestore {
  if (!db) db = getFirestore(getAdminApp())
  return db
}
