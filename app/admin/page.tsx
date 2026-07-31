"use client"

import { useEffect, useState } from "react"
import {
  AdminAlert,
  AdminCard,
  AdminMuted,
  AdminPageHeader,
  AdminStatCard,
  AdminTable,
} from "@/components/shaadi-saathi/admin/admin-ui"
import {
  fetchAdminOverview,
  type AdminOverview,
} from "@/lib/admin/client"

function formatDate(ms: number) {
  if (!ms) return "—"
  return new Date(ms).toLocaleString()
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverview | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAdminOverview()
      .then(setData)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not load overview")
      })
  }, [])

  if (error) {
    return <AdminAlert>{error}</AdminAlert>
  }

  if (!data) {
    return <AdminMuted>Loading overview…</AdminMuted>
  }

  const { stats, recentWeddings, recentErrors, recentSuccesses } = data

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Platform overview"
        description="Live counts from the connected Firebase project."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <AdminStatCard label="Weddings / accounts" value={stats.weddings} />
        <AdminStatCard label="Guests (all weddings)" value={stats.guests} />
        <AdminStatCard label="Bookings (total)" value={stats.bookings.total} />
      </div>

      <section>
        <h3 className="text-sm font-semibold text-zinc-900">Bookings by status</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              ["Requested", stats.bookings.requested],
              ["Confirmed", stats.bookings.confirmed],
              ["Completed", stats.bookings.completed],
              ["Disputed", stats.bookings.disputed],
              ["Declined", stats.bookings.declined],
              ["No-show", stats.bookings.no_show],
            ] as const
          ).map(([label, value]) => (
            <AdminCard key={label} className="px-3 py-2.5">
              <p className="text-xs text-zinc-500">{label}</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-zinc-900">
                {value}
              </p>
            </AdminCard>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <AdminCard className="p-4">
          <h3 className="text-sm font-semibold text-zinc-900">Recent signups</h3>
          <div className="mt-3">
            <AdminTable
              headers={["Wedding", "Organiser", "Created"]}
              rows={recentWeddings.map((wedding) => [
                <div key={`${wedding.id}-name`}>
                  <p className="font-medium">{wedding.name}</p>
                  <p className="text-xs text-zinc-500">{wedding.couple}</p>
                </div>,
                wedding.organiserPhone,
                formatDate(wedding.createdAt),
              ])}
              emptyMessage="No weddings yet."
            />
          </div>
        </AdminCard>

        <div className="space-y-4">
          <AdminCard className="p-4">
            <h3 className="text-sm font-semibold text-zinc-900">
              Recent verification errors
            </h3>
            <div className="mt-3">
              <AdminTable
                headers={["Flow", "Phone / code", "Time"]}
                rows={recentErrors.map((entry) => [
                  `${entry.flow} · ${entry.stage}`,
                  `${entry.phone} · ${entry.rawCode || entry.code}`,
                  formatDate(entry.timestamp),
                ])}
                emptyMessage="No errors logged."
              />
            </div>
          </AdminCard>

          <AdminCard className="p-4">
            <h3 className="text-sm font-semibold text-zinc-900">
              Recent verification successes
            </h3>
            <div className="mt-3">
              <AdminTable
                headers={["Flow", "Phone", "Time"]}
                rows={recentSuccesses.map((entry) => [
                  `${entry.flow} · ${entry.channel} · ${entry.stage}`,
                  entry.phone,
                  formatDate(entry.timestamp),
                ])}
                emptyMessage="No successes logged."
              />
            </div>
          </AdminCard>
        </div>
      </section>
    </div>
  )
}
