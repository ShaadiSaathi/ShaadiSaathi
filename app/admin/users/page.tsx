"use client"

import { useState } from "react"
import {
  AdminAlert,
  AdminButton,
  AdminCard,
  AdminInput,
  AdminMuted,
  AdminPageHeader,
  AdminTable,
} from "@/components/shaadi-saathi/admin/admin-ui"
import {
  fetchAdminUserLookup,
  type AdminUserLookup,
} from "@/lib/admin/client"

function formatDate(ms: number) {
  if (!ms) return "—"
  return new Date(ms).toLocaleString()
}

function formatMoney(amount: number) {
  return `PKR ${amount.toLocaleString()}`
}

export default function AdminUsersPage() {
  const [phone, setPhone] = useState("")
  const [result, setResult] = useState<AdminUserLookup | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await fetchAdminUserLookup(phone.trim())
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="User lookup"
        description="Search by phone number (E.164, e.g. +923001234567) to inspect account, wedding, and booking data."
      />

      <AdminCard className="p-4">
        <form onSubmit={(event) => void handleSearch(event)} className="flex flex-wrap gap-3">
          <div className="min-w-[240px] flex-1">
            <label htmlFor="admin-phone-search" className="sr-only">
              Phone number
            </label>
            <AdminInput
              id="admin-phone-search"
              type="tel"
              placeholder="+923001234567"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              autoComplete="tel"
            />
          </div>
          <AdminButton type="submit" disabled={loading || !phone.trim()}>
            {loading ? "Searching…" : "Search"}
          </AdminButton>
        </form>
      </AdminCard>

      {error ? <AdminAlert>{error}</AdminAlert> : null}

      {result ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <AdminCard className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Guests
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">
                {result.counts.guests}
              </p>
            </AdminCard>
            <AdminCard className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Tasks
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">
                {result.counts.tasks}
              </p>
            </AdminCard>
            <AdminCard className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Bookings
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">
                {result.counts.bookings}
              </p>
            </AdminCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <AdminCard className="p-4">
              <h3 className="text-sm font-semibold text-zinc-900">User profile</h3>
              {result.user ? (
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">Name</dt>
                    <dd className="text-right text-zinc-800">{result.user.name}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">Role</dt>
                    <dd className="text-right text-zinc-800">{result.user.role}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">Phone</dt>
                    <dd className="font-mono text-right text-zinc-800">
                      {result.user.phone}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">UID</dt>
                    <dd className="max-w-[220px] truncate font-mono text-right text-xs text-zinc-600">
                      {result.user.uid}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">Created</dt>
                    <dd className="text-right text-zinc-800">
                      {formatDate(result.user.createdAt)}
                    </dd>
                  </div>
                </dl>
              ) : (
                <AdminMuted>No Firestore user profile (Auth UID may still exist).</AdminMuted>
              )}
              {result.authUid && !result.user ? (
                <p className="mt-2 font-mono text-xs text-zinc-500">
                  Auth UID: {result.authUid}
                </p>
              ) : null}
            </AdminCard>

            <AdminCard className="p-4">
              <h3 className="text-sm font-semibold text-zinc-900">Wedding</h3>
              {result.wedding ? (
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">Name</dt>
                    <dd className="text-right text-zinc-800">{result.wedding.name}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">Couple</dt>
                    <dd className="text-right text-zinc-800">{result.wedding.couple}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">Organiser</dt>
                    <dd className="text-right text-zinc-800">
                      {result.wedding.organiserName}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">Phone</dt>
                    <dd className="font-mono text-right text-zinc-800">
                      {result.wedding.organiserPhone}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">Share code</dt>
                    <dd className="font-mono text-right text-zinc-800">
                      {result.wedding.shareCode}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">First event</dt>
                    <dd className="text-right text-zinc-800">
                      {result.wedding.firstEventDate}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">Premium</dt>
                    <dd className="text-right text-zinc-800">
                      {result.wedding.isPremium ? "Yes" : "No"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">Wedding ID</dt>
                    <dd className="max-w-[220px] truncate font-mono text-right text-xs text-zinc-600">
                      {result.wedding.id}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">Created</dt>
                    <dd className="text-right text-zinc-800">
                      {formatDate(result.wedding.createdAt)}
                    </dd>
                  </div>
                </dl>
              ) : (
                <AdminMuted>No wedding linked to this account.</AdminMuted>
              )}
            </AdminCard>
          </div>

          <AdminCard className="p-4">
            <h3 className="text-sm font-semibold text-zinc-900">Booking history</h3>
            <div className="mt-3">
              <AdminTable
                headers={["Vendor", "Status", "Amount", "Event", "Created"]}
                rows={result.bookings.map((booking) => [
                  booking.vendorName || "—",
                  booking.status,
                  formatMoney(booking.price),
                  booking.eventId,
                  formatDate(booking.createdAt),
                ])}
                emptyMessage="No bookings for this user."
              />
            </div>
          </AdminCard>
        </div>
      ) : null}
    </div>
  )
}
