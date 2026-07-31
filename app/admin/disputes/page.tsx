"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AdminAlert,
  AdminButton,
  AdminCard,
  AdminInput,
  AdminMuted,
  AdminPageHeader,
} from "@/components/shaadi-saathi/admin/admin-ui"
import {
  fetchAdminDisputes,
  resolveAdminDispute,
  type AdminDispute,
} from "@/lib/admin/client"

function formatDate(ms: number) {
  if (!ms) return "—"
  return new Date(ms).toLocaleString()
}

function formatMoney(amount: number) {
  return `PKR ${amount.toLocaleString()}`
}

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<AdminDispute[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await fetchAdminDisputes()
      setDisputes(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load disputes")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleResolve(
    bookingId: string,
    resolution: "family" | "vendor" | "split"
  ) {
    setBusyId(bookingId)
    setError(null)
    try {
      const splitFamilyAmount =
        resolution === "split"
          ? Number(splitAmounts[bookingId] ?? "")
          : undefined
      await resolveAdminDispute(bookingId, {
        resolution,
        splitFamilyAmount,
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resolve dispute")
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return <AdminMuted>Loading disputes…</AdminMuted>
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Dispute management"
        description="Open booking disputes requiring platform review."
      />

      {error ? <AdminAlert>{error}</AdminAlert> : null}

      {disputes.length === 0 ? (
        <AdminCard className="px-5 py-10 text-center">
          <AdminMuted>No open disputes right now.</AdminMuted>
        </AdminCard>
      ) : (
        <ul className="space-y-4">
          {disputes.map((dispute) => (
            <li key={dispute.id}>
              <AdminCard className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-zinc-900">
                      {dispute.weddingName}
                    </p>
                    <p className="text-sm text-zinc-500">
                      Family: {dispute.familyName} · Vendor: {dispute.vendorName}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                    {dispute.dispute.status}
                  </span>
                </div>

                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-zinc-500">Agreed amount</dt>
                    <dd className="font-medium text-zinc-900">
                      {formatMoney(dispute.agreedAmount)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Disputed amount</dt>
                    <dd className="font-medium text-zinc-900">
                      {dispute.disputedAmount != null
                        ? formatMoney(dispute.disputedAmount)
                        : "Not specified"}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 rounded-md border border-zinc-100 bg-zinc-50 px-3 py-3 text-sm">
                  <p className="font-medium text-zinc-900">Family reason</p>
                  <p className="mt-1 text-zinc-700">
                    {dispute.dispute.familyReason || dispute.dispute.description}
                  </p>
                  {dispute.dispute.vendorResponse ? (
                    <>
                      <p className="mt-3 font-medium text-zinc-900">
                        Vendor response
                      </p>
                      <p className="mt-1 text-zinc-700">
                        {dispute.dispute.vendorResponse}
                      </p>
                    </>
                  ) : null}
                  {dispute.dispute.evidenceFileName ? (
                    <p className="mt-2 text-xs text-zinc-500">
                      Evidence: {dispute.dispute.evidenceFileName}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-zinc-400">
                    Submitted {formatDate(dispute.dispute.submittedAt)}
                  </p>
                </div>

                {dispute.messages.length > 0 ? (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-zinc-900">Messages</p>
                    <ul className="mt-2 space-y-2">
                      {dispute.messages.map((message) => (
                        <li
                          key={message.id}
                          className="rounded-md border border-zinc-200 px-3 py-2 text-sm"
                        >
                          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                            {message.senderType}
                          </p>
                          <p className="text-zinc-800">{message.text}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <AdminButton
                    disabled={busyId === dispute.id}
                    onClick={() => void handleResolve(dispute.id, "family")}
                  >
                    Resolve for family
                  </AdminButton>
                  <AdminButton
                    variant="secondary"
                    disabled={busyId === dispute.id}
                    onClick={() => void handleResolve(dispute.id, "vendor")}
                  >
                    Resolve for vendor
                  </AdminButton>
                  <AdminInput
                    type="number"
                    min={0}
                    placeholder="Family split amount"
                    value={splitAmounts[dispute.id] ?? ""}
                    onChange={(event) =>
                      setSplitAmounts((prev) => ({
                        ...prev,
                        [dispute.id]: event.target.value,
                      }))
                    }
                    className="max-w-[180px]"
                  />
                  <AdminButton
                    variant="secondary"
                    disabled={busyId === dispute.id}
                    onClick={() => void handleResolve(dispute.id, "split")}
                  >
                    Custom split
                  </AdminButton>
                </div>
              </AdminCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
