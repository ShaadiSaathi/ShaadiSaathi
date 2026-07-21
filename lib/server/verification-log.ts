import * as Sentry from "@sentry/nextjs"
import { parsePhoneNumber } from "libphonenumber-js"
import { getAdminDb, isFirebaseAdminConfigured } from "./firebase-admin"
import type { OtpChannel, OtpFlow } from "@/lib/auth/otp-types"

export type VerificationStage = "send" | "confirm"

/** Preserve + and country calling code; never store full PII. */
export function maskPhone(phone: string): string {
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

export async function logOtpSuccess(input: {
  flow: OtpFlow | string
  phone: string
  channel: OtpChannel
  stage: VerificationStage
  /** Truncated Twilio SID or verification id — never a full secret. */
  providerId?: string
  uid?: string
}): Promise<void> {
  if (!isFirebaseAdminConfigured()) return
  try {
    await getAdminDb()
      .collection("verification_success")
      .add({
        flow: String(input.flow).slice(0, 40),
        phone: maskPhone(input.phone),
        provider: "twilio",
        channel: input.channel,
        stage: input.stage,
        verificationId: (input.providerId ?? "").slice(0, 24),
        hasVerificationId: Boolean(input.providerId),
        timestamp: Date.now(),
        uid: (input.uid ?? "").slice(0, 128),
      })
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        component: "verification-log",
        collection: "verification_success",
      },
    })
    // Logging must never interrupt verification.
  }
}

export async function logOtpError(input: {
  flow: OtpFlow | string
  phone: string
  channel?: OtpChannel | null
  stage: VerificationStage
  code: string
  message: string
  rawCode?: string
  rawMessage?: string
  uid?: string
}): Promise<void> {
  const isExpectedUserError =
    input.code.startsWith("otp/invalid-") ||
    input.code === "otp/code-expired" ||
    input.code === "otp/too-many-requests"

  Sentry.captureException(
    new Error(`OTP ${input.stage} failed: ${input.code}`),
    {
      level: isExpectedUserError ? "warning" : "error",
      tags: {
        provider: "twilio",
        channel: input.channel ?? "unknown",
        flow: String(input.flow).slice(0, 40),
        stage: input.stage,
        otp_code: input.code.slice(0, 100),
      },
      extra: {
        providerCode: (input.rawCode ?? "").slice(0, 100),
      },
    }
  )

  if (!isFirebaseAdminConfigured()) return
  try {
    await getAdminDb()
      .collection("verification_errors")
      .add({
        flow: String(input.flow).slice(0, 40),
        stage: input.stage,
        code: input.code.slice(0, 100),
        message: input.message.slice(0, 500),
        rawCode: (input.rawCode ?? "").slice(0, 100),
        rawMessage: (input.rawMessage ?? "").slice(0, 500),
        provider: "twilio",
        channel: input.channel ?? "",
        phone: maskPhone(input.phone),
        timestamp: Date.now(),
        uid: (input.uid ?? "").slice(0, 128),
      })
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        component: "verification-log",
        collection: "verification_errors",
      },
    })
    // Logging must never interrupt verification.
  }
}
