/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAYMENTS — DO NOT ACTIVATE ON PRODUCTION WITHOUT EXPLICIT SIGN-OFF
 * ═══════════════════════════════════════════════════════════════════════════
 * Safepay vendor payouts (Raastwire). Defaults to SANDBOX base URL
 * https://dev.api.getsafepay.com/raastwire. Production API host is blocked
 * without explicit PAYMENTS_ALLOW_LIVE + PAYMENTS_PRODUCTION_SIGN_OFF.
 *
 * Docs: https://safepay.mintlify.app/use-cases/payouts
 * Requires: SAFEPAY_API_KEY, SAFEPAY_SECRET_KEY, SAFEPAY_AGGREGATOR_ID
 * (plus a validated Pakistani creditor IBAN per payout).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { requireSafepayConfigured } from "./config"
import type { PayoutVendorInput, PayoutVendorResult, SafepayPayoutStatus } from "./types"

type SafepayPayoutResponse = {
  api_version?: string
  data?: {
    token?: string
    status?: SafepayPayoutStatus
    amount?: string
    request_id?: string
    trace_reference?: string
    msg_id?: string
    created_at?: string
  }
  message?: string
}

const IBAN_PK_PATTERN = /^PK\d{2}[A-Z0-9]{20}$/i

function assertValidIban(iban: string): string {
  const normalized = iban.replace(/\s+/g, "").toUpperCase()
  if (!IBAN_PK_PATTERN.test(normalized)) {
    throw new Error(
      "Vendor payout requires a valid Pakistani IBAN (e.g. PK25ALFH0216001008658216)"
    )
  }
  return normalized
}

/**
 * Disburse escrowed funds to a vendor via Safepay Raastwire payout.
 * Amount is a PKR string per Safepay docs (e.g. "200" = PKR 200).
 *
 * IMPORTANT: This never defaults to the production host. Sandbox credentials
 * are required to exercise this path until production sign-off.
 */
export async function createVendorPayout(
  input: PayoutVendorInput
): Promise<PayoutVendorResult> {
  const creds = requireSafepayConfigured()
  const creditorIban = assertValidIban(input.creditorIban)
  const amount = Math.round(input.amountPkr)
  if (amount < 1) {
    throw new Error("Payout amount must be at least 1 PKR")
  }

  const url = `${creds.baseUrl}/v1/aggregators/${encodeURIComponent(creds.aggregatorId)}/payout`

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-SFPY-AGGREGATOR-SECRET-KEY": creds.secretKey,
      // API key kept on the request for environments that expect it;
      // Raastwire docs authenticate primarily via the aggregator secret.
      ...(creds.apiKey ? { "X-SFPY-API-KEY": creds.apiKey } : {}),
    },
    body: JSON.stringify({
      request_id: input.requestId,
      amount: String(amount),
      creditor_iban: creditorIban,
    }),
  })

  const payload = (await response.json().catch(() => ({}))) as SafepayPayoutResponse

  if (!response.ok) {
    throw new Error(
      `Safepay payout failed (${response.status}): ${
        payload.message ?? JSON.stringify(payload)
      }`
    )
  }

  const data = payload.data
  if (!data?.token || !data.status) {
    throw new Error("Safepay payout response was missing token/status")
  }

  return {
    token: data.token,
    status: data.status,
    amountPkr: data.amount ?? String(amount),
    requestId: data.request_id ?? input.requestId,
    traceReference: data.trace_reference,
    msgId: data.msg_id,
    createdAt: data.created_at ?? new Date().toISOString(),
  }
}

/**
 * Optional title-fetch helper for IBAN validation before payout.
 * Safepay docs: validate beneficiary before calling payout.
 */
export async function validateBeneficiaryIban(iban: string): Promise<{
  ok: boolean
  raw: unknown
}> {
  const creds = requireSafepayConfigured()
  const creditorIban = assertValidIban(iban)
  const url = `${creds.baseUrl}/v1/aggregators/${encodeURIComponent(
    creds.aggregatorId
  )}/title-fetch?iban=${encodeURIComponent(creditorIban)}`

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-SFPY-AGGREGATOR-SECRET-KEY": creds.secretKey,
      ...(creds.apiKey ? { "X-SFPY-API-KEY": creds.apiKey } : {}),
    },
  })

  const raw: unknown = await response.json().catch(() => null)
  return { ok: response.ok, raw }
}
