import {
  VENDOR_UNVERIFIED_PAYMENT_MESSAGE,
  vendorCanReceivePayments,
} from "@/lib/firebase/vendor-verification"
import { getAdminDb } from "@/lib/server/firebase-admin"
import { PaymentAuthError } from "@/lib/server/payment-auth"

/**
 * Server-side gate: block deposit release / payout until vendor is verified.
 * Fail closed when the vendor doc is missing or status is not "verified".
 */
export async function assertVendorVerifiedForPayments(vendorId: string): Promise<void> {
  const id = vendorId.trim()
  if (!id) {
    throw new PaymentAuthError(400, "Booking is missing vendor")
  }

  const snap = await getAdminDb().collection("vendors").doc(id).get()
  if (!snap.exists) {
    throw new PaymentAuthError(404, "Vendor not found")
  }

  const status = snap.data()?.verificationStatus
  if (!vendorCanReceivePayments(status)) {
    throw new PaymentAuthError(403, VENDOR_UNVERIFIED_PAYMENT_MESSAGE)
  }
}
