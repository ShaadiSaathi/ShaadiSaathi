/** Staging-only demo session — never enable on production. */

export const TESTER_STORAGE_KEY = "ss-tester-mode"

/** Query secret for /tester?k=… — preview/staging only. */
export const TESTER_LINK_SECRET = "ss-mobile-preview"

export function readTesterModeFromStorage(): boolean {
  if (typeof window === "undefined") return false
  try {
    return sessionStorage.getItem(TESTER_STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

export function writeTesterModeToStorage(on: boolean): void {
  if (typeof window === "undefined") return
  try {
    if (on) sessionStorage.setItem(TESTER_STORAGE_KEY, "1")
    else sessionStorage.removeItem(TESTER_STORAGE_KEY)
  } catch {
    // ignore quota / private mode
  }
}
