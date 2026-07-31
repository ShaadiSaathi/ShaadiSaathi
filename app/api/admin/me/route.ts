export const runtime = "nodejs"

import {
  adminErrorResponse,
  verifyAdminRequest,
} from "@/lib/server/admin-auth"

export async function GET(request: Request) {
  try {
    const admin = await verifyAdminRequest(request)
    return Response.json(
      { ok: true, phone: admin.phone },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (err) {
    return adminErrorResponse(err)
  }
}
