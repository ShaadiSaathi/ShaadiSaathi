/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAYMENTS — DO NOT ACTIVATE ON PRODUCTION WITHOUT EXPLICIT SIGN-OFF
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { NextResponse } from "next/server"
import { getPaymentsAvailability } from "@/lib/payments"

export const runtime = "nodejs"

export async function GET() {
  const availability = getPaymentsAvailability()
  return NextResponse.json(availability)
}
