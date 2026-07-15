import { collection, doc, setDoc } from "firebase/firestore"
import { getFirestoreDb, isFirebaseConfigured } from "./config"

export type VerificationStage = "send" | "confirm"

export interface VerificationErrorInput {
  /** Which flow the user was in, e.g. "family-signup" | "family-login". */
  flow: string
  /** Whether the failure happened while sending or confirming the code. */
  stage: VerificationStage
  /** Stable error code (Firebase auth/* code, "timeout", or "unknown"). */
  code: string
  /** The friendly message the user was shown. */
  message: string
  /** The phone number involved (stored masked for privacy). */
  phone: string
  /** Firebase Auth UID if one exists yet (usually empty pre-auth). */
  uid?: string
}

/** Store only a partially-masked phone so the log is useful but not full PII. */
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.length <= 4) return digits
  return `${digits.slice(0, 3)}***${digits.slice(-2)}`
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
      phone: maskPhone(input.phone),
      uid: (input.uid ?? "").slice(0, 128),
      timestamp: Date.now(),
    })
  } catch {
    // Swallow: logging must never interrupt the verification experience.
  }
}
