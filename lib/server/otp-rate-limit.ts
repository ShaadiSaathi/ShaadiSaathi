import { getAdminDb } from "./firebase-admin"

const WINDOW_MS = 15 * 60 * 1000
const MAX_SENDS_PER_WINDOW = 5

function limitDocId(phone: string): string {
  return phone.replace(/[^0-9+]/g, "").slice(0, 20) || "unknown"
}

/** Phone-keyed OTP send throttle (Admin SDK). Throws a 429-style Error message. */
export async function assertOtpSendAllowed(phone: string): Promise<void> {
  const ref = getAdminDb().collection("otp_rate_limits").doc(limitDocId(phone))
  const now = Date.now()

  await getAdminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const data = snap.data() as { count?: number; windowStart?: number } | undefined
    const windowStart = typeof data?.windowStart === "number" ? data.windowStart : now
    const count = typeof data?.count === "number" ? data.count : 0
    const inWindow = now - windowStart < WINDOW_MS

    if (inWindow && count >= MAX_SENDS_PER_WINDOW) {
      throw Object.assign(new Error("otp/too-many-requests"), { code: "otp/too-many-requests" })
    }

    tx.set(ref, {
      phone,
      count: inWindow ? count + 1 : 1,
      windowStart: inWindow ? windowStart : now,
      updatedAt: now,
    })
  })
}
