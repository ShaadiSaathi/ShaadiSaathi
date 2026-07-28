import { NextResponse } from "next/server"
import { isFirebaseAdminConfigured } from "@/lib/server/firebase-admin"
import { runDueSoonReminders } from "@/lib/server/due-soon-reminders"

/**
 * Manual / staging trigger for due-soon in-app notifications.
 * Prefer the scheduled Cloud Function once staging is on Blaze.
 *
 * Auth: require header `x-reminder-secret` matching REMINDER_TRIGGER_SECRET
 * when that env var is set. If unset (local staging), allow open access.
 */
export async function POST(request: Request) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { error: "Firebase Admin is not configured" },
      { status: 503 }
    )
  }

  const secret = process.env.REMINDER_TRIGGER_SECRET
  if (secret) {
    const provided = request.headers.get("x-reminder-secret")
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  try {
    const result = await runDueSoonReminders()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error("due-soon reminders failed", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to run reminders" },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  return POST(request)
}
