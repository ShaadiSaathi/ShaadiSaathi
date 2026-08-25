/**
 * Server-side Firebase App Check verification for Next.js API routes.
 *
 * Modes (APP_CHECK_MODE):
 * - off      — skip verification (default until Console + site key are ready)
 * - monitor  — verify when present; log failures; never reject (staging rollout)
 * - enforce  — require a valid X-Firebase-AppCheck token
 *
 * Always used *alongside* Firebase Auth ID token checks, never instead of them.
 */

import { getAppCheck } from "firebase-admin/app-check"
import {
  getAdminAuth,
  isFirebaseAdminConfigured,
} from "@/lib/server/firebase-admin"

export const APP_CHECK_HEADER = "X-Firebase-AppCheck"

export type AppCheckMode = "off" | "monitor" | "enforce"

export class AppCheckError extends Error {
  readonly status: number
  readonly code = "APP_CHECK_FAILED" as const

  constructor(status: number, message: string) {
    super(message)
    this.name = "AppCheckError"
    this.status = status
  }
}

export function getAppCheckMode(): AppCheckMode {
  const raw = process.env.APP_CHECK_MODE?.trim().toLowerCase()
  if (raw === "enforce" || raw === "monitor" || raw === "off") return raw
  return "off"
}

function extractToken(request: Request): string | null {
  const header = request.headers.get(APP_CHECK_HEADER)?.trim()
  return header || null
}

/**
 * Verify App Check for a request according to APP_CHECK_MODE.
 * No-ops when mode is off or Firebase Admin is not configured.
 */
export async function assertAppCheck(request: Request): Promise<void> {
  const mode = getAppCheckMode()
  if (mode === "off") return

  if (!isFirebaseAdminConfigured()) {
    if (mode === "enforce") {
      throw new AppCheckError(503, "App Check cannot be verified (Admin not configured)")
    }
    console.warn("[app-check] monitor: Admin not configured — skipping")
    return
  }

  // Ensure Admin app is initialized before getAppCheck().
  getAdminAuth()

  const token = extractToken(request)
  if (!token) {
    if (mode === "enforce") {
      throw new AppCheckError(401, "Missing App Check token")
    }
    console.warn("[app-check] monitor: missing X-Firebase-AppCheck header", {
      path: new URL(request.url).pathname,
    })
    return
  }

  try {
    await getAppCheck().verifyToken(token)
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid"
    if (mode === "enforce") {
      throw new AppCheckError(401, "Invalid App Check token")
    }
    console.warn("[app-check] monitor: token verification failed", {
      path: new URL(request.url).pathname,
      message,
    })
  }
}

/**
 * Mint an App Check token for automated tests (Admin SDK).
 * Requires FIREBASE_APP_CHECK_APP_ID (the web app's Firebase App ID).
 */
export async function mintAppCheckTokenForTests(): Promise<string> {
  const appId =
    process.env.FIREBASE_APP_CHECK_APP_ID?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim()
  if (!appId) {
    throw new Error(
      "Set FIREBASE_APP_CHECK_APP_ID or NEXT_PUBLIC_FIREBASE_APP_ID to mint App Check tokens"
    )
  }
  if (!isFirebaseAdminConfigured()) {
    throw new Error("FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON required to mint App Check tokens")
  }
  // Ensure admin app is initialized
  const { getAdminAuth } = await import("@/lib/server/firebase-admin")
  getAdminAuth()
  const { token } = await getAppCheck().createToken(appId)
  return token
}
