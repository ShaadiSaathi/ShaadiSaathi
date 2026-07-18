import { getAdminAuth } from "./firebase-admin"
import { OtpApiError } from "@/lib/auth/otp-types"

/**
 * Resolve a stable Firebase Auth UID for a verified phone number.
 * Always prefer an existing phone-auth user so weddings/profiles stay linked.
 */
export async function findOrCreateUserByPhone(
  phone: string
): Promise<{ uid: string; customToken: string }> {
  const auth = getAdminAuth()

  let uid: string
  try {
    const existing = await auth.getUserByPhoneNumber(phone)
    uid = existing.uid
  } catch (err) {
    const code =
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      typeof (err as { code: unknown }).code === "string"
        ? (err as { code: string }).code
        : ""

    if (code !== "auth/user-not-found") {
      throw new OtpApiError(
        "otp/auth-failed",
        "We verified your code but couldn't sign you in. Please try again.",
        500
      )
    }

    try {
      const created = await auth.createUser({ phoneNumber: phone })
      uid = created.uid
    } catch (createErr) {
      // Race: another request created the same phone between get and create.
      const createCode =
        typeof createErr === "object" &&
        createErr !== null &&
        "code" in createErr &&
        typeof (createErr as { code: unknown }).code === "string"
          ? (createErr as { code: string }).code
          : ""
      if (
        createCode === "auth/phone-number-already-exists" ||
        createCode === "auth/uid-already-exists"
      ) {
        const raced = await auth.getUserByPhoneNumber(phone)
        uid = raced.uid
      } else {
        throw new OtpApiError(
          "otp/auth-failed",
          "We verified your code but couldn't sign you in. Please try again.",
          500
        )
      }
    }
  }

  try {
    const customToken = await auth.createCustomToken(uid)
    return { uid, customToken }
  } catch {
    throw new OtpApiError(
      "otp/auth-failed",
      "We verified your code but couldn't sign you in. Please try again.",
      500
    )
  }
}
