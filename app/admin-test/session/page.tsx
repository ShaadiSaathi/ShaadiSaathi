"use client"

/**
 * Staging-only helper: sign in with a Firebase custom token, then open admin.
 * Hard-gated to shaadisaathistaging so this page is inert on production Firebase.
 */

import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { signInWithCustomToken } from "firebase/auth"
import { getFirebaseAuth } from "@/lib/firebase/config"

function SessionInner() {
  const router = useRouter()
  const params = useSearchParams()
  const [message, setMessage] = useState("Signing in…")

  useEffect(() => {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    if (projectId !== "shaadisaathistaging") {
      setMessage("This helper only works against shaadisaathistaging.")
      return
    }

    const token = params.get("token")?.trim()
    const next = params.get("next")?.trim() || "/admin/automation"
    if (!token) {
      setMessage("Missing token query param.")
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        await signInWithCustomToken(getFirebaseAuth(), token)
        if (cancelled) return
        setMessage("Signed in — redirecting…")
        router.replace(next.startsWith("/") ? next : "/admin/automation")
      } catch (err) {
        if (cancelled) return
        setMessage(err instanceof Error ? err.message : "Sign-in failed")
      }
    })()

    return () => {
      cancelled = true
    }
  }, [params, router])

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <p className="text-sm text-zinc-600">{message}</p>
    </main>
  )
}

export default function StagingAdminSessionPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-zinc-500">Loading…</p>}>
      <SessionInner />
    </Suspense>
  )
}
