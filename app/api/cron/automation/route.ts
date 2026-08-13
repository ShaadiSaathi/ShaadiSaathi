/**
 * Manual / staging trigger for booking automation (dispute 48h + no-show grace).
 * Prefer the scheduled Cloud Function once staging Functions are deployed.
 *
 * Auth: header `x-automation-secret` must match AUTOMATION_TRIGGER_SECRET
 * (falls back to REMINDER_TRIGGER_SECRET for staging convenience).
 */

import { runBookingAutomationSweep } from "@/lib/server/booking-automation"
import { isFirebaseAdminConfigured } from "@/lib/server/firebase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function assertSecret(request: Request): boolean {
  const expected =
    process.env.AUTOMATION_TRIGGER_SECRET?.trim() ||
    process.env.REMINDER_TRIGGER_SECRET?.trim()
  if (!expected) return false
  return request.headers.get("x-automation-secret") === expected
}

async function handle(request: Request) {
  if (!assertSecret(request)) {
    return Response.json({ ok: false, message: "Unauthorized" }, { status: 401 })
  }
  if (!isFirebaseAdminConfigured()) {
    return Response.json(
      { ok: false, message: "Firebase Admin is not configured" },
      { status: 503 }
    )
  }

  try {
    const result = await runBookingAutomationSweep({ source: "manual_trigger" })
    return Response.json({
      ok: true,
      ...result,
      at: Date.now(),
    })
  } catch (err) {
    console.error("[cron/automation]", err)
    return Response.json(
      {
        ok: false,
        message: err instanceof Error ? err.message : "Automation sweep failed",
      },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  return handle(request)
}

export async function POST(request: Request) {
  return handle(request)
}
