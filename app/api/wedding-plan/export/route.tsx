/**
 * POST /api/wedding-plan/export
 * Premium owner/full-collaborator only — returns a branded PDF download.
 */

import { renderToBuffer } from "@react-pdf/renderer"
import { NextResponse } from "next/server"
import { WeddingPlanPdfDocument } from "@/lib/wedding-plan-export/WeddingPlanPdf"
import type { WeddingPlanExportClientPayload } from "@/lib/wedding-plan-export/types"
import { PaymentAuthError, verifyPaymentUser } from "@/lib/server/payment-auth"
import { AppCheckError } from "@/lib/server/app-check"
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin"
import {
  buildWeddingPlanExportSnapshot,
  formatExportFilename,
} from "@/lib/server/wedding-plan-export"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    if (!isFirebaseAdminConfigured()) {
      return NextResponse.json(
        { error: "Firebase Admin is not configured" },
        { status: 503 }
      )
    }

    const user = await verifyPaymentUser(request)
    const userSnap = await getAdminDb().collection("users").doc(user.uid).get()
    if (!userSnap.exists) {
      return NextResponse.json({ error: "User profile not found" }, { status: 403 })
    }

    const weddingId = userSnap.data()?.weddingId
    if (typeof weddingId !== "string" || !weddingId) {
      return NextResponse.json(
        { error: "No wedding linked to this account" },
        { status: 403 }
      )
    }

    let payload: WeddingPlanExportClientPayload = {}
    try {
      const body = (await request.json()) as WeddingPlanExportClientPayload
      if (body && typeof body === "object") {
        payload = {
          daySchedules: body.daySchedules,
        }
      }
    } catch {
      // empty body is fine
    }

    const displayName =
      typeof userSnap.data()?.name === "string"
        ? (userSnap.data()?.name as string)
        : undefined

    const snapshot = await buildWeddingPlanExportSnapshot({
      uid: user.uid,
      weddingId,
      payload,
      exportedByName: displayName,
    })

    // react-pdf's renderToBuffer types expect DocumentProps; our wrapper is equivalent.
    const buffer = await renderToBuffer(
      (<WeddingPlanPdfDocument snapshot={snapshot} />) as Parameters<
        typeof renderToBuffer
      >[0]
    )
    const filename = formatExportFilename(snapshot)

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (err) {
    if (err instanceof PaymentAuthError || err instanceof AppCheckError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[wedding-plan/export]", err)
    return NextResponse.json(
      { error: "Could not generate wedding plan PDF" },
      { status: 500 }
    )
  }
}
