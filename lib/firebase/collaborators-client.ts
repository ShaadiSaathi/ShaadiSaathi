"use client"

import { getFirebaseAuth } from "@/lib/firebase/config"

export interface AcceptCollaboratorInviteResult {
  weddingId: string
  weddingName?: string
  firstEventDate?: string
  alreadyMember?: boolean
}

export async function acceptCollaboratorInviteApi(
  inviteId: string
): Promise<AcceptCollaboratorInviteResult> {
  const user = getFirebaseAuth().currentUser
  if (!user) throw new Error("Sign in to accept this invite.")

  const token = await user.getIdToken()
  const res = await fetch("/api/collaborators/accept", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ inviteId }),
  })

  const data = (await res.json().catch(() => ({}))) as {
    error?: string
    weddingId?: string
    weddingName?: string
    firstEventDate?: string
    alreadyMember?: boolean
  }

  if (!res.ok) {
    throw new Error(data.error ?? "Could not accept invite. Please try again.")
  }

  if (!data.weddingId) {
    throw new Error("Server did not return a wedding ID.")
  }

  return {
    weddingId: data.weddingId,
    weddingName: data.weddingName,
    firstEventDate: data.firstEventDate,
    alreadyMember: data.alreadyMember,
  }
}
