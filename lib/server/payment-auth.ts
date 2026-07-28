/**
 * Auth helper for payment API routes — any signed-in Firebase user.
 * Does not grant admin; payment routes must still authorize booking ownership.
 */

import { getAdminAuth, isFirebaseAdminConfigured } from "./firebase-admin"

export class PaymentAuthError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "PaymentAuthError"
    this.status = status
  }
}

export async function verifyPaymentUser(
  request: Request
): Promise<{ uid: string; email?: string }> {
  if (!isFirebaseAdminConfigured()) {
    throw new PaymentAuthError(503, "Firebase Admin is not configured")
  }

  const header = request.headers.get("authorization") ?? ""
  if (!header.startsWith("Bearer ")) {
    throw new PaymentAuthError(401, "Sign in to continue with payment")
  }

  const idToken = header.slice("Bearer ".length).trim()
  if (!idToken) {
    throw new PaymentAuthError(401, "Sign in to continue with payment")
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken)
    return {
      uid: decoded.uid,
      email: typeof decoded.email === "string" ? decoded.email : undefined,
    }
  } catch {
    throw new PaymentAuthError(401, "Invalid session — please sign in again")
  }
}
