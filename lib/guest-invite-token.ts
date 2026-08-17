/** UUID v4 from `crypto.randomUUID()` — 128-bit, unguessable invite capability. */
export const GUEST_INVITE_TOKEN_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

export function isGuestInviteToken(value: string): boolean {
  return GUEST_INVITE_TOKEN_PATTERN.test(value)
}

/** Cryptographically random guest invite token (also used as the Firestore doc id). */
export function makeGuestInviteToken(): string {
  const cryptoObj = globalThis.crypto
  if (!cryptoObj || typeof cryptoObj.randomUUID !== "function") {
    throw new Error("Secure random token generation is not available.")
  }
  return cryptoObj.randomUUID()
}
