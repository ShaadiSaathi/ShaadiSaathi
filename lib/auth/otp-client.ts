import type { OtpChannel, OtpFlow } from "@/lib/auth/otp-types"

export type { OtpChannel, OtpFlow }

export class OtpClientError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = "OtpClientError"
    this.code = code
  }
}

async function parseResponse(res: Response): Promise<Record<string, unknown>> {
  let data: Record<string, unknown> = {}
  try {
    data = (await res.json()) as Record<string, unknown>
  } catch {
    data = {}
  }
  return data
}

export async function requestSendOtp(input: {
  phone: string
  channel?: OtpChannel
  flow?: string
}): Promise<{ channel: OtpChannel }> {
  const res = await fetch("/api/auth/send-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: input.phone,
      channel: input.channel ?? "whatsapp",
      flow: input.flow ?? "unknown",
    }),
    cache: "no-store",
  })

  const data = await parseResponse(res)
  if (!res.ok || data.ok !== true) {
    throw new OtpClientError(
      typeof data.code === "string" ? data.code : "otp/send-failed",
      typeof data.message === "string"
        ? data.message
        : "We couldn't send your code. Please try again."
    )
  }

  const channel =
    data.channel === "sms" || data.channel === "whatsapp"
      ? data.channel
      : (input.channel ?? "whatsapp")

  return { channel }
}

export async function requestVerifyOtp(input: {
  phone: string
  code: string
  flow?: string
}): Promise<{ token: string; channel: OtpChannel }> {
  const res = await fetch("/api/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: input.phone,
      code: input.code,
      flow: input.flow ?? "unknown",
    }),
    cache: "no-store",
  })

  const data = await parseResponse(res)
  if (!res.ok || data.ok !== true || typeof data.token !== "string" || !data.token) {
    throw new OtpClientError(
      typeof data.code === "string" ? data.code : "otp/invalid-code",
      typeof data.message === "string"
        ? data.message
        : "That code isn't correct. Please re-check the 6 digits and try again."
    )
  }

  const channel =
    data.channel === "sms" || data.channel === "whatsapp" ? data.channel : "whatsapp"

  return { token: data.token, channel }
}
