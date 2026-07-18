import {
  isOtpChannel,
  isOtpFlow,
  normalizeE164,
  OtpApiError,
  OTP_FRIENDLY,
  type OtpChannel,
  type OtpFlow,
} from "@/lib/auth/otp-types"
import { otpErrorResponse, otpJson, readJsonBody } from "@/lib/server/request"
import { isFirebaseAdminConfigured } from "@/lib/server/firebase-admin"
import { isTwilioConfigured, sendTwilioOtp } from "@/lib/server/twilio"
import { logOtpError, logOtpSuccess } from "@/lib/server/verification-log"

export const runtime = "nodejs"

export async function POST(request: Request) {
  let phone = ""
  let channel: OtpChannel = "whatsapp"
  let flow: OtpFlow = "unknown"

  try {
    if (!isTwilioConfigured() || !isFirebaseAdminConfigured()) {
      throw new OtpApiError(
        "otp/not-configured",
        OTP_FRIENDLY["otp/not-configured"]!,
        503
      )
    }

    const body = await readJsonBody(request)
    const normalized = normalizeE164(body.phone)
    if (!normalized) {
      throw new OtpApiError(
        "otp/invalid-phone",
        OTP_FRIENDLY["otp/invalid-phone"]!,
        400
      )
    }
    phone = normalized

    if (body.channel !== undefined && body.channel !== null) {
      if (!isOtpChannel(body.channel)) {
        throw new OtpApiError(
          "otp/invalid-channel",
          OTP_FRIENDLY["otp/invalid-channel"]!,
          400
        )
      }
      channel = body.channel
    }

    if (body.flow !== undefined && body.flow !== null && isOtpFlow(body.flow)) {
      flow = body.flow
    }

    const result = await sendTwilioOtp(phone, channel)

    void logOtpSuccess({
      flow,
      phone,
      channel: result.channel,
      stage: "send",
      providerId: result.sid,
    })

    return otpJson({ ok: true, channel: result.channel })
  } catch (err) {
    const code =
      err instanceof OtpApiError ? err.code : "otp/send-failed"
    const message =
      err instanceof OtpApiError
        ? err.message
        : OTP_FRIENDLY["otp/send-failed"]!

    const rawCode =
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      typeof (err as { code: unknown }).code !== "undefined"
        ? String((err as { code: unknown }).code)
        : ""
    const rawMessage =
      err instanceof Error ? err.message.slice(0, 500) : String(err).slice(0, 500)

    void logOtpError({
      flow,
      phone: phone || "unknown",
      channel,
      stage: "send",
      code,
      message,
      rawCode,
      rawMessage,
    })

    return otpErrorResponse(
      err instanceof OtpApiError
        ? err
        : new OtpApiError(code, message, 502)
    )
  }
}
