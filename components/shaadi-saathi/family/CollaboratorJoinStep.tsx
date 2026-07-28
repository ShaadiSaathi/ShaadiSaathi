"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import GoldButton from "@/components/shaadi-saathi/app/GoldButton"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import type { FirestoreCollaboratorInvite } from "@/lib/firebase/types"

interface CollaboratorJoinStepProps {
  fallbackHref: string
  successHref?: string
}

export default function CollaboratorJoinStep({
  fallbackHref,
  successHref = "/dashboard",
}: CollaboratorJoinStepProps) {
  const router = useRouter()
  const {
    pendingCollaboratorInvites,
    refreshPendingCollaboratorInvites,
    acceptCollaboratorInvite,
    isFamilyLoggedIn,
  } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<FirestoreCollaboratorInvite | null>(null)

  useEffect(() => {
    void refreshPendingCollaboratorInvites()
  }, [refreshPendingCollaboratorInvites])

  useEffect(() => {
    if (pendingCollaboratorInvites.length === 1) {
      setSelected(pendingCollaboratorInvites[0]!)
    }
  }, [pendingCollaboratorInvites])

  useEffect(() => {
    if (!isFamilyLoggedIn) return
    if (pendingCollaboratorInvites.length === 0) {
      router.replace(fallbackHref)
    }
  }, [isFamilyLoggedIn, pendingCollaboratorInvites.length, fallbackHref, router])

  if (pendingCollaboratorInvites.length === 0) {
    return (
      <p className="text-sm text-maroon/60" role="status">
        Checking for wedding invites…
      </p>
    )
  }

  async function handleAccept() {
    if (!selected) {
      setError("Please select a wedding invite to accept.")
      return
    }
    setError(null)
    setLoading(true)
    try {
      await acceptCollaboratorInvite(selected.id)
      router.push(successHref)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not join this wedding. Please try again."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-maroon/70">
        You&apos;ve been invited to help plan a wedding. Accept to join — you won&apos;t create a
        separate wedding of your own.
      </p>

      {pendingCollaboratorInvites.length > 1 && (
        <ul className="space-y-2">
          {pendingCollaboratorInvites.map((invite) => (
            <li key={invite.id}>
              <button
                type="button"
                onClick={() => setSelected(invite)}
                className={`w-full rounded-xl border p-4 text-left transition ${
                  selected?.id === invite.id
                    ? "border-maroon bg-maroon/5 ring-2 ring-maroon/15"
                    : "border-gold/20 hover:border-gold/40"
                }`}
              >
                <p className="font-medium text-maroon-dark">{invite.weddingName}</p>
                <p className="mt-1 text-xs text-maroon/50">
                  Invited by {invite.invitedByName}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {pendingCollaboratorInvites.length === 1 && selected && (
        <div className="rounded-xl border border-gold/25 bg-ivory/60 p-4">
          <p className="font-medium text-maroon-dark">{selected.weddingName}</p>
          <p className="mt-1 text-sm text-maroon/60">
            Invited by {selected.invitedByName}
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-rose-600" role="alert">
          {error}
        </p>
      )}

      <GoldButton type="button" onClick={handleAccept} disabled={loading}>
        {loading ? "Please wait…" : "Join this wedding"}
      </GoldButton>

      <p className="text-center text-xs text-maroon/50">
        Wrong invite?{" "}
        <button
          type="button"
          className="font-semibold text-maroon hover:text-gold-dark"
          onClick={() => router.push(fallbackHref)}
        >
          Set up my own wedding instead
        </button>
      </p>
    </div>
  )
}
