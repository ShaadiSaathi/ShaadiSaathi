import { parsePhoneNumber } from "react-phone-number-input"
import { collection, doc, setDoc } from "firebase/firestore"
import { getFirestoreDb, isFirebaseConfigured } from "./config"

export interface VerificationSuccessInput {
  /** Which flow the user was in, e.g. "family-signup" | "family-login". */
  flow: string
  /** The phone number involved (stored masked for privacy). */
  phone: string
  /**
   * Firebase ConfirmationResult.verificationId — confirms the promise resolved
   * with a real session, not an optimistic UI flip. Stored truncated.
   */
  verificationId: string
  /** Firebase Auth UID if one exists yet (usually empty pre-auth). */
  uid?: string
}

/** Same masking as verification_errors — preserve + and country calling code. */
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
    // fall through
  }
  const hasPlus = raw.startsWith("+")
  const digits = raw.replace(/\D/g, "")
  if (digits.length <= 4) return `${hasPlus ? "+" : ""}${digits}`
  return `${hasPlus ? "+" : ""}${digits.slice(0, 3)}***${digits.slice(-2)}`
}

/**
 * Best-effort write when signInWithPhoneNumber genuinely resolves with a
 * verificationId. Fire-and-forget: never throws. Use this to distinguish
 * "Firebase accepted the send" from "carrier never delivered the SMS".
 */
export async function logVerificationSuccess(
  input: VerificationSuccessInput
): Promise<void> {
  if (!isFirebaseConfigured()) return
  try {
    const ref = doc(collection(getFirestoreDb(), "verification_success"))
    await setDoc(ref, {
      flow: input.flow.slice(0, 40),
      phone: maskPhone(input.phone),
      // Truncate — enough to confirm a real id was issued, not full session secret
      verificationId: input.verificationId.slice(0, 24),
      hasVerificationId: true,
      timestamp: Date.now(),
      uid: (input.uid ?? "").slice(0, 128),
    })
  } catch {
    // Swallow: logging must never interrupt the verification experience.
  }
}
