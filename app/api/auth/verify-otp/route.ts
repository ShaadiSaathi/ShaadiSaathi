import { findOrCreateUserByPhone } from "@/lib/server/auth-users"
import {
  isOtpFlow,
  normalizeE164,
  normalizeOtpCode,
  OtpApiError,
  OTP_FRIENDLY,
  type OtpChannel,
  type OtpFlow,
} from "@/lib/auth/otp-types"
import { otpErrorResponse, otpJson, readJsonBody } from "@/lib/server/request"
import { isFirebaseAdminConfigured } from "@/lib/server/firebase-admin"
import { checkTwilioOtp, isTwilioConfigured } from "@/lib/server/twilio"
import { logOtpError, logOtpSuccess } from "@/lib/server/verification-log"

export const runtime = "nodejs"

export async function POST(request: Request) {
  let phone = ""
  let flow: OtpFlow = "unknown"
  let channel: OtpChannel | null = null

  try {
    if (!isTwilioConfigured() || !isFirebaseAdminConfigured()) {
      throw new OtpApiError(
        "otp/not-configured",
        OTP_FRIENDLY["otp/not-configured"]!,
        503
      )
    }

    const body = await readJsonBody(request)
    const normalizedPhone = normalizeE164(body.phone)
    const code = normalizeOtpCode(body.code)

    if (!normalizedPhone) {
      throw new OtpApiError(
        "otp/invalid-phone",
        OTP_FRIENDLY["otp/invalid-phone"]!,
        400
      )
    }
    if (!code) {
      throw new OtpApiError(
        "otp/invalid-code",
        OTP_FRIENDLY["otp/invalid-code"]!,
        400
      )
    }

    phone = normalizedPhone
    if (body.flow !== undefined && body.flow !== null && isOtpFlow(body.flow)) {
      flow = body.flow
    }

    const check = await checkTwilioOtp(phone, code)
    channel = check.channel

    if (!check.approved) {
      throw new OtpApiError(
        "otp/invalid-code",
        OTP_FRIENDLY["otp/invalid-code"]!,
        400
      )
    }

    const { uid, customToken } = await findOrCreateUserByPhone(phone)

    void logOtpSuccess({
      flow,
      phone,
      channel: channel ?? "whatsapp",
      stage: "confirm",
      providerId: check.sid,
      uid,
    })

    return otpJson({
      ok: true,
      token: customToken,
      channel: channel ?? "whatsapp",
    })
  } catch (err) {
    const code =
      err instanceof OtpApiError ? err.code : "otp/check-failed"
    const message =
      err instanceof OtpApiError
        ? err.message
        : OTP_FRIENDLY["otp/check-failed"]!

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
      stage: "confirm",
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
