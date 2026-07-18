import twilio from "twilio"
import type { OtpChannel } from "@/lib/auth/otp-types"
import { OtpApiError } from "@/lib/auth/otp-types"

let client: ReturnType<typeof twilio> | undefined

export function isTwilioConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      process.env.TWILIO_VERIFY_SERVICE_SID?.trim()
  )
}

function getTwilioClient(): ReturnType<typeof twilio> {
  if (!isTwilioConfigured()) {
    throw new OtpApiError(
      "otp/not-configured",
      "Verification isn't set up yet. Please try again later.",
      503
    )
  }
  if (!client) {
    client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    )
  }
  return client
}

function getVerifyServiceSid(): string {
  const sid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim()
  if (!sid) {
    throw new OtpApiError(
      "otp/not-configured",
      "Verification isn't set up yet. Please try again later.",
      503
    )
  }
  return sid
}

function mapTwilioError(err: unknown): OtpApiError {
  if (err instanceof OtpApiError) return err

  const maybe = err as {
    code?: number | string
    status?: number
    message?: string
    moreInfo?: string
  }

  const twilioCode = maybe.code
  const status = typeof maybe.status === "number" ? maybe.status : 502
  const rawMessage = typeof maybe.message === "string" ? maybe.message : ""

  // 60200 invalid parameter, 60203 max send attempts, 60202 max check attempts,
  // 20404 not found, 60205 SMS not allowed to landline, etc.
  if (twilioCode === 60200 || /invalid.*phone|not a valid/i.test(rawMessage)) {
    return new OtpApiError(
      "otp/invalid-phone",
      "That phone number doesn't look right. Please go back and check it.",
      400
    )
  }
  if (twilioCode === 60203 || twilioCode === 60202 || status === 429) {
    return new OtpApiError(
      "otp/too-many-requests",
      "Too many attempts. Please wait a little while, then tap Retry.",
      429
    )
  }
  if (/expired/i.test(rawMessage)) {
    return new OtpApiError(
      "otp/code-expired",
      "That code has expired. Tap Resend to get a new one.",
      400
    )
  }
  if (status >= 500 || /network|ECONN|ETIMEDOUT/i.test(rawMessage)) {
    return new OtpApiError(
      "otp/network",
      "Network problem — check your connection and try again.",
      502
    )
  }

  return new OtpApiError(
    "otp/send-failed",
    "We couldn't send your code. Please tap Retry, or try SMS instead.",
    502
  )
}

export async function sendTwilioOtp(
  phone: string,
  channel: OtpChannel
): Promise<{ status: string; sid: string; channel: OtpChannel }> {
  try {
    const verification = await getTwilioClient()
      .verify.v2.services(getVerifyServiceSid())
      .verifications.create({
        to: phone,
        channel,
      })

    const status = verification.status ?? ""
    if (status !== "pending") {
      throw new OtpApiError(
        "otp/send-failed",
        "We couldn't send your code. Please tap Retry, or try SMS instead.",
        502
      )
    }

    return {
      status,
      sid: typeof verification.sid === "string" ? verification.sid : "",
      channel:
        verification.channel === "sms" || verification.channel === "whatsapp"
          ? verification.channel
          : channel,
    }
  } catch (err) {
    throw mapTwilioError(err)
  }
}

export async function checkTwilioOtp(
  phone: string,
  code: string
): Promise<{
  approved: boolean
  channel: OtpChannel | null
  sid: string
  status: string
}> {
  try {
    const check = await getTwilioClient()
      .verify.v2.services(getVerifyServiceSid())
      .verificationChecks.create({
        to: phone,
        code,
      })

    const status = check.status ?? ""
    const approved = check.valid === true && status === "approved"
    const channel =
      check.channel === "sms" || check.channel === "whatsapp"
        ? check.channel
        : null

    return {
      approved,
      channel,
      sid: typeof check.sid === "string" ? check.sid : "",
      status,
    }
  } catch (err) {
    // Wrong codes often come back as pending/valid:false rather than throw;
    // map hard failures carefully.
    const mapped = mapTwilioError(err)
    if (mapped.code === "otp/send-failed") {
      throw new OtpApiError(
        "otp/check-failed",
        "We couldn't verify that code. Please try again or request a new one.",
        502
      )
    }
    throw mapped
  }
}
