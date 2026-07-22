"use client"

import * as Sentry from "@sentry/nextjs"
import { useState } from "react"

type TestStatus = "idle" | "sending" | "sent" | "failed"

export default function SentryTestPage() {
  const [clientStatus, setClientStatus] = useState<TestStatus>("idle")
  const [serverStatus, setServerStatus] = useState<TestStatus>("idle")

  function testClientError() {
    setClientStatus("sending")
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
      setClientStatus("failed")
      return
    }

    const eventId = Sentry.captureException(
      new Error("Shaadi Saathi Sentry client test error")
    )
    setClientStatus(eventId ? "sent" : "failed")
  }

  async function testServerError() {
    setServerStatus("sending")

    try {
      const response = await fetch("/api/sentry-test", { method: "POST" })
      if (response.status === 500) {
        setServerStatus("sent")
        return
      }

      // Surface missing/malformed DSN without relying on opaque button text alone.
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; dsnCheck?: { present?: boolean; host?: string | null } }
        | null
      console.warn("[sentry-test] server response", {
        status: response.status,
        error: payload?.error,
        dsnPresent: payload?.dsnCheck?.present,
        dsnHost: payload?.dsnCheck?.host ?? null,
      })
      setServerStatus("failed")
    } catch {
      setServerStatus("failed")
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-8 px-6 py-16">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-rose-700">
          Diagnostics
        </p>
        <h1 className="mt-2 font-serif text-4xl text-stone-900">
          Sentry test
        </h1>
        <p className="mt-3 text-stone-600">
          Use these controls only to confirm that the configured Sentry project
          receives browser and server events.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TestButton
          label="Send client error"
          status={clientStatus}
          onClick={testClientError}
        />
        <TestButton
          label="Trigger server error"
          status={serverStatus}
          onClick={testServerError}
        />
      </div>

      <p className="text-sm text-stone-500">
        Events can take a few seconds to appear in Sentry. Remove this route
        after production monitoring is confirmed.
      </p>
    </main>
  )
}

function TestButton({
  label,
  status,
  onClick,
}: {
  label: string
  status: TestStatus
  onClick: () => void
}) {
  const statusLabel = {
    idle: label,
    sending: "Sending…",
    sent: "Event sent — check Sentry",
    failed: "Failed — check the DSN",
  }[status]

  return (
    <button
      type="button"
      className="min-h-12 rounded-xl bg-rose-700 px-4 py-3 font-semibold text-white transition hover:bg-rose-800 disabled:cursor-wait disabled:opacity-70"
      disabled={status === "sending"}
      onClick={onClick}
    >
      {statusLabel}
    </button>
  )
}
