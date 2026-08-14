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
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({})

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
      const custom = rejectReasons[vendorId]?.trim()
      await reviewAdminVendorVerification(vendorId, {
        action,
        rejectionReason:
          action === "reject"
            ? custom ||
              "Your verification details could not be approved. Please check your CNIC / ID number and business details, then resubmit from Onboarding."
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
        description="Review guided onboarding submissions (business, portfolio, services, CNIC) before vendors go active."
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
                  <div className="min-w-0 flex-1 space-y-2">
                    <div>
                      <p className="font-semibold text-zinc-900">
                        {vendor.verificationBusinessName}
                      </p>
                      <p className="mt-0.5 text-sm text-zinc-500">
                        Listing: {vendor.businessName}
                        {vendor.categoryId ? ` · ${vendor.categoryId}` : ""} ·{" "}
                        {vendor.verificationCity}
                      </p>
                    </div>
                    <p className="font-mono text-sm text-zinc-800">
                      CNIC / ID: {vendor.verificationCnic}
                    </p>
                    {typeof vendor.startingPrice === "number" ? (
                      <p className="text-sm text-zinc-600">
                        From PKR {vendor.startingPrice.toLocaleString()}
                        {vendor.pricingNotes ? ` — ${vendor.pricingNotes}` : ""}
                      </p>
                    ) : null}
                    {vendor.availableFor?.length ? (
                      <p className="text-sm text-zinc-600">
                        Events: {vendor.availableFor.join(", ")}
                      </p>
                    ) : null}
                    {vendor.bio ? (
                      <p className="text-sm leading-relaxed text-zinc-700">
                        {vendor.bio}
                      </p>
                    ) : null}
                    {vendor.photoUrls && vendor.photoUrls.length > 0 ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {vendor.photoUrls.slice(0, 6).map((url) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={url}
                            src={url}
                            alt=""
                            className="h-16 w-16 rounded-lg object-cover"
                          />
                        ))}
                      </div>
                    ) : null}
                    <p className="text-xs text-zinc-400">
                      Phone {vendor.phone}
                      {vendor.email ? ` · ${vendor.email}` : ""} · Submitted{" "}
                      {formatDate(vendor.verificationSubmittedAt)}
                    </p>
                    <label className="block pt-2 text-xs font-medium text-zinc-500">
                      Rejection reason (optional)
                      <textarea
                        className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
                        rows={2}
                        value={rejectReasons[vendor.id] ?? ""}
                        onChange={(e) =>
                          setRejectReasons((prev) => ({
                            ...prev,
                            [vendor.id]: e.target.value,
                          }))
                        }
                        placeholder="Shown to the vendor in-app if you reject"
                      />
                    </label>
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
