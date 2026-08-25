/**
 * Shared helper for Node test scripts that call authenticated API routes.
 * Mints an App Check token via Admin SDK when APP_CHECK_MODE is monitor/enforce.
 *
 * Usage in scripts:
 *   const headers = await apiAuthHeaders(idToken)
 */

import {
  APP_CHECK_HEADER,
  getAppCheckMode,
  mintAppCheckTokenForTests,
} from "../../lib/server/app-check"

export async function apiAuthHeaders(
  idToken: string
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${idToken}`,
    "Content-Type": "application/json",
  }

  const mode = getAppCheckMode()
  if (mode === "off") return headers

  try {
    const appCheckToken = await mintAppCheckTokenForTests()
    headers[APP_CHECK_HEADER] = appCheckToken
  } catch (err) {
    if (mode === "enforce") throw err
    console.warn(
      "[app-check] could not mint test token (monitor mode continues):",
      err instanceof Error ? err.message : err
    )
  }

  return headers
}
