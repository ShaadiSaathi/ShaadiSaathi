import { Resend } from "resend"
import {
  EMAIL_NOT_CONFIGURED_MESSAGE,
  getEmailFromAddress,
  isEmailConfigured,
  normalizeEmail,
} from "./config"

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; skipped: true; reason: "not_configured" | "no_recipient" | "invalid_recipient" }
  | { ok: false; skipped: false; reason: string }

let resendSingleton: Resend | null = null

function getResend(): Resend | null {
  if (!isEmailConfigured()) return null
  if (!resendSingleton) {
    resendSingleton = new Resend(process.env.RESEND_API_KEY!.trim())
  }
  return resendSingleton
}

/**
 * Low-level send. Never throws for missing config / missing recipient —
 * callers can fire-and-forget without breaking the primary flow.
 */
export async function sendEmail(input: {
  to: string | null | undefined
  subject: string
  text: string
  html?: string
}): Promise<SendEmailResult> {
  const to = normalizeEmail(input.to)
  if (!input.to?.trim()) {
    return { ok: false, skipped: true, reason: "no_recipient" }
  }
  if (!to) {
    return { ok: false, skipped: true, reason: "invalid_recipient" }
  }

  const client = getResend()
  if (!client) {
    console.info(`[email] ${EMAIL_NOT_CONFIGURED_MESSAGE} — skipped "${input.subject}" to ${to}`)
    return { ok: false, skipped: true, reason: "not_configured" }
  }

  try {
    const { data, error } = await client.emails.send({
      from: getEmailFromAddress(),
      to: [to],
      subject: input.subject,
      text: input.text,
      ...(input.html ? { html: input.html } : {}),
    })
    if (error) {
      console.error("[email] Resend error:", error)
      return { ok: false, skipped: false, reason: error.message }
    }
    return { ok: true, id: data?.id ?? "sent" }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email send failed"
    console.error("[email] send failed:", message)
    return { ok: false, skipped: false, reason: message }
  }
}
