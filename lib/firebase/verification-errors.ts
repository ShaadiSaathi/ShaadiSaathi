import { parsePhoneNumber } from "react-phone-number-input"
import { collection, doc, setDoc } from "firebase/firestore"
import { getFirestoreDb, isFirebaseConfigured } from "./config"

export type VerificationStage = "send" | "confirm"

export interface VerificationErrorInput {
  /** Which flow the user was in, e.g. "family-signup" | "family-login". */
  flow: string
  /** Whether the failure happened while sending or confirming the code. */
  stage: VerificationStage
  /** Stable, mapped code (Firebase auth/* code, "timeout", or "unknown"). */
  code: string
  /** The friendly message the user was shown. */
  message: string
  /** The RAW, original Firebase error code (e.g. "auth/invalid-phone-number"). */
  rawCode?: string
  /** The RAW, original Firebase error message, for deeper debugging. */
  rawMessage?: string
  /** The phone number involved (stored masked for privacy). */
  phone: string
  /** Firebase Auth UID if one exists yet (usually empty pre-auth). */
  uid?: string
}

/**
 * Store a partially-masked phone so the log is useful but not full PII.
 *
 * Crucially this PRESERVES the leading "+" and country calling code so a masked
 * international number reads like "+44••••••56" (clearly a UK number) instead of
 * "447***56". If the value isn't parseable E.164 we fall back to a digit mask
 * that still keeps a leading "+" when present — so a value that reaches us
 * WITHOUT a country code stands out immediately (e.g. "308***01" with no "+").
 */
function maskPhone(phone: string): string {
  const raw = (phone ?? "").trim()
  try {
    const parsed = parsePhoneNumber(raw)
    if (parsed) {
      const nat = parsed.nationalNumber
      const masked =
        nat.length > 2 ? `${"•".repeat(nat.length - 2)}${nat.slice(-2)}` : nat
      return `+${parsed.countryCallingCode}${masked}`
    }
  } catch {
    // fall through to digit-based masking
  }
  const hasPlus = raw.startsWith("+")
  const digits = raw.replace(/\D/g, "")
  if (digits.length <= 4) return `${hasPlus ? "+" : ""}${digits}`
  return `${hasPlus ? "+" : ""}${digits.slice(0, 3)}***${digits.slice(-2)}`
}

/**
 * Best-effort write to the `verification_errors` collection so we can debug
 * OTP delivery/verification problems. This is intentionally fire-and-forget:
 * it NEVER throws, so a logging failure can't break the auth flow (and it's a
 * no-op in local/mock mode where Firebase isn't configured).
 */
export async function logVerificationError(
  input: VerificationErrorInput
): Promise<void> {
  if (!isFirebaseConfigured()) return
  try {
    const ref = doc(collection(getFirestoreDb(), "verification_errors"))
    await setDoc(ref, {
      flow: input.flow.slice(0, 40),
      stage: input.stage,
      code: input.code.slice(0, 100),
      message: input.message.slice(0, 500),
      rawCode: (input.rawCode ?? "").slice(0, 100),
      rawMessage: (input.rawMessage ?? "").slice(0, 500),
      phone: maskPhone(input.phone),
      timestamp: Date.now(),
      uid: (input.uid ?? "").slice(0, 128),
    })
  } catch {
    // Swallow: logging must never interrupt the verification experience.
  }
}
