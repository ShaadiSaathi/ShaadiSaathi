"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AdminAlert,
  AdminMuted,
  AdminPageHeader,
  AdminTable,
} from "@/components/shaadi-saathi/admin/admin-ui"
import {
  fetchAdminAutomationLogs,
  type AdminAutomationLog,
} from "@/lib/admin/client"

function formatDate(ms: number) {
  if (!ms) return "—"
  return new Date(ms).toLocaleString()
}

export default function AdminAutomationPage() {
  const [logs, setLogs] = useState<AdminAutomationLog[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(null)
    fetchAdminAutomationLogs(50)
      .then(setLogs)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not load logs")
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (error) {
    return <AdminAlert>{error}</AdminAlert>
  }

  if (!logs) {
    return <AdminMuted>Loading automation log…</AdminMuted>
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Automation log"
        description="Actions taken by scheduled jobs (dispute auto-resolve, no-show grace flip, refunds, notifications)."
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={load}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Refresh
        </button>
      </div>

      {logs.length === 0 ? (
        <AdminMuted>No automated actions logged yet.</AdminMuted>
      ) : (
        <AdminTable
          headers={["When", "Action", "Booking", "Source", "Message"]}
          rows={logs.map((log) => [
            formatDate(log.createdAt),
            log.action,
            log.bookingId,
            log.source,
            log.message,
          ])}
        />
      )}
    </div>
  )
}
