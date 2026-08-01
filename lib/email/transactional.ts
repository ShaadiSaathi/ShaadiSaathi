/**
 * Resolve optional contact emails and send transactional messages.
 * Skips silently when the user has no email on file.
 */

import { getAdminDb } from "@/lib/server/firebase-admin"
import { sendEmail, type SendEmailResult } from "./send"

export async function getUserEmail(uid: string | null | undefined): Promise<string | null> {
  if (!uid) return null
  const snap = await getAdminDb().collection("users").doc(uid).get()
  if (!snap.exists) return null
  const email = snap.data()?.email
  return typeof email === "string" && email.trim() ? email.trim() : null
}

export async function getWeddingOwnerEmail(weddingId: string): Promise<{
  uid: string | null
  email: string | null
}> {
  const snap = await getAdminDb().collection("weddings").doc(weddingId).get()
  if (!snap.exists) return { uid: null, email: null }
  const ownerId = snap.data()?.ownerId
  if (typeof ownerId !== "string" || !ownerId) return { uid: null, email: null }
  return { uid: ownerId, email: await getUserEmail(ownerId) }
}

export async function getVendorOwnerEmail(vendorId: string): Promise<{
  uid: string | null
  email: string | null
}> {
  const snap = await getAdminDb().collection("vendors").doc(vendorId).get()
  if (!snap.exists) return { uid: null, email: null }
  const data = snap.data()!
  const ownerUid = typeof data.ownerUid === "string" ? data.ownerUid : null
  if (ownerUid) {
    const fromUser = await getUserEmail(ownerUid)
    if (fromUser) return { uid: ownerUid, email: fromUser }
  }
  // Fallback: optional email on the vendor listing itself
  const listingEmail = typeof data.email === "string" ? data.email.trim() : ""
  return { uid: ownerUid, email: listingEmail || null }
}

function pkr(amount: number): string {
  return `PKR ${Math.round(amount).toLocaleString("en-PK")}`
}

export async function sendPaymentReceiptEmail(input: {
  to: string | null | undefined
  kind: "deposit" | "balance"
  amountPkr: number
  bookingId: string
  weddingName?: string
  vendorName?: string
  eventLabel?: string
}): Promise<SendEmailResult> {
  const label = input.kind === "deposit" ? "Deposit" : "Balance"
  const subject = `Shaadi Saathi payment receipt — ${label}`
  const lines = [
    `Thank you. Your ${label.toLowerCase()} payment was received.`,
    "",
    `Amount: ${pkr(input.amountPkr)}`,
    input.weddingName ? `Wedding: ${input.weddingName}` : null,
    input.vendorName ? `Vendor: ${input.vendorName}` : null,
    input.eventLabel ? `Event: ${input.eventLabel}` : null,
    `Booking ID: ${input.bookingId}`,
    "",
    "This is an automated receipt from Shaadi Saathi.",
  ].filter(Boolean) as string[]

  return sendEmail({
    to: input.to,
    subject,
    text: lines.join("\n"),
  })
}

export async function sendBookingConfirmationEmail(input: {
  to: string | null | undefined
  weddingName?: string
  vendorName?: string
  eventLabel?: string
  eventDate?: string
  bookingId: string
  depositAmountPkr?: number
}): Promise<SendEmailResult> {
  const subject = "Shaadi Saathi — booking confirmed"
  const lines = [
    "Your vendor booking is confirmed.",
    "",
    input.weddingName ? `Wedding: ${input.weddingName}` : null,
    input.vendorName ? `Vendor: ${input.vendorName}` : null,
    input.eventLabel ? `Event: ${input.eventLabel}` : null,
    input.eventDate ? `Date: ${input.eventDate}` : null,
    input.depositAmountPkr != null
      ? `Deposit held: ${pkr(input.depositAmountPkr)}`
      : null,
    `Booking ID: ${input.bookingId}`,
    "",
    "Open Shaadi Saathi to view details and messages.",
  ].filter(Boolean) as string[]

  return sendEmail({
    to: input.to,
    subject,
    text: lines.join("\n"),
  })
}

export async function sendDisputeOutcomeEmail(input: {
  to: string | null | undefined
  audience: "family" | "vendor"
  resolution: "family" | "vendor" | "split"
  weddingName?: string
  eventLabel?: string
  bookingId: string
  autoResolved?: boolean
  summary?: string
}): Promise<SendEmailResult> {
  const who =
    input.resolution === "family"
      ? "in favour of the family"
      : input.resolution === "vendor"
        ? "in favour of the vendor"
        : "with a split outcome"
  const subject = `Shaadi Saathi — dispute resolved ${who}`
  const lines = [
    input.autoResolved
      ? "A dispute was auto-resolved because the vendor response window ended."
      : "A dispute on your booking has been resolved.",
    "",
    `Outcome: ${who}`,
    input.summary ? input.summary : null,
    input.weddingName ? `Wedding: ${input.weddingName}` : null,
    input.eventLabel ? `Event: ${input.eventLabel}` : null,
    `Booking ID: ${input.bookingId}`,
    "",
    "Open Shaadi Saathi for the full details.",
  ].filter(Boolean) as string[]

  return sendEmail({
    to: input.to,
    subject,
    text: lines.join("\n"),
  })
}

/** Notify family + vendor owners when a dispute resolves (skips missing emails). */
export async function emailDisputeParties(input: {
  weddingId: string
  vendorId: string
  bookingId: string
  resolution: "family" | "vendor" | "split"
  weddingName?: string
  eventLabel?: string
  autoResolved?: boolean
  familySummary?: string
  vendorSummary?: string
}): Promise<{ family: SendEmailResult; vendor: SendEmailResult }> {
  const family = await getWeddingOwnerEmail(input.weddingId)
  const vendor = await getVendorOwnerEmail(input.vendorId)

  const familyResult = await sendDisputeOutcomeEmail({
    to: family.email,
    audience: "family",
    resolution: input.resolution,
    weddingName: input.weddingName,
    eventLabel: input.eventLabel,
    bookingId: input.bookingId,
    autoResolved: input.autoResolved,
    summary: input.familySummary,
  })
  const vendorResult = await sendDisputeOutcomeEmail({
    to: vendor.email,
    audience: "vendor",
    resolution: input.resolution,
    weddingName: input.weddingName,
    eventLabel: input.eventLabel,
    bookingId: input.bookingId,
    autoResolved: input.autoResolved,
    summary: input.vendorSummary,
  })

  return { family: familyResult, vendor: vendorResult }
}
