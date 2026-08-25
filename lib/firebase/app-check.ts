/**
 * Firebase App Check (client).
 *
 * Providers (set in Firebase Console → App Check → Apps):
 * - reCAPTCHA v3 (default): NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY
 * - reCAPTCHA Enterprise: NEXT_PUBLIC_FIREBASE_APP_CHECK_PROVIDER=recaptcha-enterprise
 *   + the same site key env var
 *
 * Local / CI debug:
 * - Register a debug token in Firebase Console → App Check → Manage debug tokens
 * - Set NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN=<that-uuid>
 * - Keep the site key set so initializeAppCheck still uses ReCaptcha*Provider;
 *   the debug global makes attestation succeed without a real reCAPTCHA challenge.
 */

"use client"

import {
  initializeAppCheck,
  getToken,
  ReCaptchaV3Provider,
  ReCaptchaEnterpriseProvider,
  type AppCheck,
} from "firebase/app-check"
import { getFirebaseApp, isFirebaseConfigured } from "@/lib/firebase/config"

export const APP_CHECK_HEADER = "X-Firebase-AppCheck"

let appCheck: AppCheck | undefined
let initAttempted = false

function siteKey(): string {
  return process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY?.trim() ?? ""
}

function providerKind(): "recaptcha-v3" | "recaptcha-enterprise" {
  const raw = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_PROVIDER?.trim().toLowerCase()
  return raw === "recaptcha-enterprise" ? "recaptcha-enterprise" : "recaptcha-v3"
}

/**
 * Must run in the browser before Firestore / Storage / sensitive API calls.
 * Safe to call multiple times; no-ops when Firebase or site key is missing.
 */
export function ensureAppCheck(): AppCheck | undefined {
  if (typeof window === "undefined") return undefined
  if (appCheck) return appCheck
  if (initAttempted) return undefined
  initAttempted = true

  if (!isFirebaseConfigured()) return undefined

  const key = siteKey()
  if (!key) return undefined

  try {
    const debugToken = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN?.trim()
    const g = globalThis as typeof globalThis & {
      FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean
    }
    if (debugToken) {
      g.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken
    } else if (process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG === "true") {
      // Logs a debug token in the browser console for you to register in Console.
      g.FIREBASE_APPCHECK_DEBUG_TOKEN = true
    }

    const provider =
      providerKind() === "recaptcha-enterprise"
        ? new ReCaptchaEnterpriseProvider(key)
        : new ReCaptchaV3Provider(key)

    appCheck = initializeAppCheck(getFirebaseApp(), {
      provider,
      isTokenAutoRefreshEnabled: true,
    })
    return appCheck
  } catch (err) {
    console.warn("[app-check] init failed", err)
    return undefined
  }
}

/** Returns an App Check JWT for custom backends, or null if App Check is inactive. */
export async function getAppCheckToken(forceRefresh = false): Promise<string | null> {
  const instance = ensureAppCheck()
  if (!instance) return null
  try {
    const { token } = await getToken(instance, forceRefresh)
    return token || null
  } catch (err) {
    console.warn("[app-check] getToken failed", err)
    return null
  }
}

/** Merge App Check header into an existing HeadersInit when a token is available. */
export async function withAppCheckHeaders(
  headers?: HeadersInit
): Promise<Record<string, string>> {
  const base: Record<string, string> = {}
  if (headers) {
    const h = new Headers(headers)
    h.forEach((value, key) => {
      base[key] = value
    })
  }
  const token = await getAppCheckToken()
  if (token) {
    base[APP_CHECK_HEADER] = token
  }
  return base
}
