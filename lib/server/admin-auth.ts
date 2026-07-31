import { normalizeE164 } from "@/lib/auth/otp-types"
import { getAdminAuth, getAdminDb, isFirebaseAdminConfigured } from "./firebase-admin"

export class AdminAuthError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "AdminAuthError"
    this.status = status
  }
}

/** Comma-separated E.164 numbers in ADMIN_PHONE_NUMBERS (or legacy ADMIN_PHONE_NUMBER). */
export function getAdminPhoneAllowlist(): string[] {
  const raw =
    process.env.ADMIN_PHONE_NUMBERS?.trim() ||
    process.env.ADMIN_PHONE_NUMBER?.trim() ||
    ""
  if (!raw) return []

  return raw
    .split(",")
    .map((entry) => normalizeE164(entry.trim()))
    .filter((phone): phone is string => Boolean(phone))
}

export function isAdminPhoneConfigured(): boolean {
  return getAdminPhoneAllowlist().length > 0
}

async function resolveUserPhone(uid: string, tokenPhone?: string): Promise<string | null> {
  const fromToken = tokenPhone ? normalizeE164(tokenPhone) : null
  if (fromToken) return fromToken

  const snap = await getAdminDb().collection("users").doc(uid).get()
  const profilePhone =
    typeof snap.data()?.phone === "string" ? snap.data()!.phone : ""
  return normalizeE164(profilePhone)
}

export async function verifyAdminRequest(
  request: Request
): Promise<{ uid: string; phone: string }> {
  if (!isFirebaseAdminConfigured()) {
    throw new AdminAuthError(503, "Firebase Admin is not configured")
  }
  if (!isAdminPhoneConfigured()) {
    throw new AdminAuthError(503, "Admin access is not configured")
  }

  const header = request.headers.get("authorization") ?? ""
  if (!header.startsWith("Bearer ")) {
    throw new AdminAuthError(401, "Missing authorization")
  }

  const idToken = header.slice("Bearer ".length).trim()
  if (!idToken) {
    throw new AdminAuthError(401, "Missing authorization")
  }

  let decoded: Awaited<ReturnType<ReturnType<typeof getAdminAuth>["verifyIdToken"]>>
  try {
    decoded = await getAdminAuth().verifyIdToken(idToken)
  } catch {
    throw new AdminAuthError(401, "Invalid session")
  }

  const phone = await resolveUserPhone(decoded.uid, decoded.phone_number)
  const allowlist = getAdminPhoneAllowlist()
  if (!phone || !allowlist.includes(phone)) {
    throw new AdminAuthError(403, "Forbidden")
  }

  if (decoded.platformAdmin !== true) {
    await getAdminAuth().setCustomUserClaims(decoded.uid, {
      platformAdmin: true,
    })
  }

  return { uid: decoded.uid, phone }
}

export function adminErrorResponse(err: unknown): Response {
  if (err instanceof AdminAuthError) {
    return Response.json(
      { ok: false, message: err.message },
      { status: err.status, headers: { "Cache-Control": "no-store" } }
    )
  }

  console.error("Admin API unexpected error:", err)
  return Response.json(
    { ok: false, message: "Something went wrong" },
    { status: 500, headers: { "Cache-Control": "no-store" } }
  )
}
