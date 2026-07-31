"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AdminAlert,
  AdminButton,
  AdminCard,
  AdminMuted,
  AdminPageHeader,
} from "@/components/shaadi-saathi/admin/admin-ui"
import {
  fetchAdminPendingVendors,
  reviewAdminVendorVerification,
  type AdminPendingVendor,
} from "@/lib/admin/client"

function formatDate(ms: number) {
  if (!ms) return "—"
  return new Date(ms).toLocaleString()
}

export default function AdminVendorVerificationPage() {
  const [vendors, setVendors] = useState<AdminPendingVendor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await fetchAdminPendingVendors()
      setVendors(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load verifications")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleReview(vendorId: string, action: "approve" | "reject") {
    setBusyId(vendorId)
    setError(null)
    try {
      await reviewAdminVendorVerification(vendorId, {
        action,
        rejectionReason:
          action === "reject"
            ? "Your verification details could not be approved. Please check your CNIC / ID number and business details, then resubmit from your Profile."
            : undefined,
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update verification")
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return <AdminMuted>Loading pending verifications…</AdminMuted>
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Vendor verification"
        description="Manual review of CNIC / ID submissions before vendors can receive deposits or payouts."
      />

      {error ? <AdminAlert>{error}</AdminAlert> : null}

      {vendors.length === 0 ? (
        <AdminCard className="px-5 py-10 text-center">
          <AdminMuted>No vendors awaiting verification.</AdminMuted>
        </AdminCard>
      ) : (
        <ul className="space-y-4">
          {vendors.map((vendor) => (
            <li key={vendor.id}>
              <AdminCard className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-zinc-900">
                      {vendor.verificationBusinessName}
                    </p>
                    <p className="mt-0.5 text-sm text-zinc-500">
                      Listing name: {vendor.businessName} · {vendor.verificationCity}
                    </p>
                    <p className="mt-2 font-mono text-sm text-zinc-800">
                      CNIC / ID: {vendor.verificationCnic}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      Phone {vendor.phone} · Submitted{" "}
                      {formatDate(vendor.verificationSubmittedAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <AdminButton
                      type="button"
                      disabled={busyId === vendor.id}
                      onClick={() => void handleReview(vendor.id, "approve")}
                    >
                      Approve
                    </AdminButton>
                    <AdminButton
                      type="button"
                      variant="danger"
                      disabled={busyId === vendor.id}
                      onClick={() => void handleReview(vendor.id, "reject")}
                    >
                      Reject
                    </AdminButton>
                  </div>
                </div>
              </AdminCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
