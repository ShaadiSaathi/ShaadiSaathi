/**
 * Admin API — recent automated actions (dispute/no-show sweeps).
 */

import {
  adminErrorResponse,
  verifyAdminRequest,
} from "@/lib/server/admin-auth"
import { getAdminDb } from "@/lib/server/firebase-admin"

export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    await verifyAdminRequest(request)
    const limitParam = Number(new URL(request.url).searchParams.get("limit") ?? "40")
    const limit = Number.isFinite(limitParam)
      ? Math.min(100, Math.max(1, Math.floor(limitParam)))
      : 40

    const snap = await getAdminDb()
      .collection("automation_logs")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get()

    const logs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    return Response.json({ ok: true, logs })
  } catch (err) {
    return adminErrorResponse(err)
  }
}
