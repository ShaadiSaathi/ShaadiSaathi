const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "")

export function getApiBaseUrl(): string {
  if (!API_URL) {
    throw new Error(
      "EXPO_PUBLIC_API_URL is not set. Point it at your Next.js deploy (e.g. https://shaadi-saathi-kappa.vercel.app)."
    )
  }
  return API_URL
}

type OtpJson = {
  ok?: boolean
  token?: string
  channel?: string
  error?: string
  code?: string
  message?: string
}

async function postJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as T & OtpJson
  if (!res.ok) {
    throw new Error(data.message || data.error || `Request failed (${res.status})`)
  }
  return data
}

export async function sendMobileOtp(input: {
  phone: string
  flow?: "login" | "signup"
  channel?: "whatsapp" | "sms"
}): Promise<{ channel: string }> {
  const data = await postJson<OtpJson>("/api/auth/send-otp", {
    phone: input.phone,
    flow: input.flow ?? "login",
    channel: input.channel ?? "whatsapp",
  })
  return { channel: data.channel ?? "whatsapp" }
}

export async function verifyMobileOtp(input: {
  phone: string
  code: string
  flow?: "login" | "signup"
}): Promise<{ token: string }> {
  const data = await postJson<OtpJson>("/api/auth/verify-otp", {
    phone: input.phone,
    code: input.code,
    flow: input.flow ?? "login",
  })
  if (!data.token) throw new Error("No session token returned")
  return { token: data.token }
}

/** Normalize to E.164; bare digits treated as Pakistan (+92). */
export function toE164(phone: string): string {
  const trimmed = phone.trim()
  if (trimmed.startsWith("+")) return trimmed
  const digits = trimmed.replace(/\D/g, "")
  if (digits.length === 10) return `+92${digits}`
  if (digits.startsWith("92") && digits.length >= 12) return `+${digits}`
  return digits ? `+${digits}` : trimmed
}
