import { NextResponse } from "next/server"
import { OtpApiError, OTP_FRIENDLY } from "@/lib/auth/otp-types"

const MAX_BODY_BYTES = 4_096

export async function readJsonBody(
  request: Request
): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.includes("application/json")) {
    throw new OtpApiError(
      "otp/invalid-body",
      OTP_FRIENDLY["otp/invalid-body"]!,
      400
    )
  }

  const raw = await request.text()
  if (raw.length > MAX_BODY_BYTES) {
    throw new OtpApiError(
      "otp/invalid-body",
      OTP_FRIENDLY["otp/invalid-body"]!,
      413
    )
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw || "{}")
  } catch {
    throw new OtpApiError(
      "otp/invalid-body",
      OTP_FRIENDLY["otp/invalid-body"]!,
      400
    )
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new OtpApiError(
      "otp/invalid-body",
      OTP_FRIENDLY["otp/invalid-body"]!,
      400
    )
  }

  return parsed as Record<string, unknown>
}

export function otpErrorResponse(err: unknown): NextResponse {
  if (err instanceof OtpApiError) {
    return NextResponse.json(
      { ok: false, code: err.code, message: err.message },
      {
        status: err.status,
        headers: { "Cache-Control": "no-store" },
      }
    )
  }

  console.error("OTP API unexpected error:", err)
  return NextResponse.json(
    {
      ok: false,
      code: "otp/check-failed",
      message: "Something went wrong during verification. Please try again.",
    },
    {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    }
  )
}

export function otpJson(data: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  })
}
