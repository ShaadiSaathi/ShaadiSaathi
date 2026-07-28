"use client"

import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore"
import { parsePhoneNumber } from "react-phone-number-input"
import { getFirestoreDb } from "./config"
import type { FirestoreCollaboratorInvite, FirestoreUser } from "./types"
import { getUserProfile } from "./users"

/** Normalize to E.164 for consistent invite matching. */
export function normalizeCollaboratorPhone(phone: string): string {
  const trimmed = phone.trim()
  try {
    const parsed = parsePhoneNumber(trimmed)
    if (parsed) return parsed.number
  } catch {
    // fall through
  }
  if (trimmed.startsWith("+")) return trimmed
  const digits = trimmed.replace(/\D/g, "")
  return digits ? `+${digits}` : trimmed
}

function inviteDocId(weddingId: string, phone: string): string {
  const normalized = normalizeCollaboratorPhone(phone)
  const slug = normalized.replace(/[^\d+]/g, "").replace(/^\+/, "")
  return `${weddingId}_${slug}`
}

export interface WeddingMemberProfile {
  uid: string
  name: string
  phone: string
  role: "owner" | "collaborator"
}

export async function fetchWeddingMemberProfiles(
  weddingId: string,
  ownerId: string
): Promise<WeddingMemberProfile[]> {
  const weddingSnap = await getDoc(doc(getFirestoreDb(), "weddings", weddingId))
  if (!weddingSnap.exists()) return []
  const memberUids = (weddingSnap.data().memberUids as string[] | undefined) ?? []
  const profiles = await Promise.all(
    memberUids.map(async (uid) => {
      const profile = await getUserProfile(getFirestoreDb(), uid)
      return {
        uid,
        name: profile?.name ?? "Member",
        phone: profile?.phone ?? "",
        role: uid === ownerId ? ("owner" as const) : ("collaborator" as const),
      }
    })
  )
  return profiles
}

export async function getPendingInvitesForPhone(
  phone: string
): Promise<FirestoreCollaboratorInvite[]> {
  const normalized = normalizeCollaboratorPhone(phone)
  const q = query(
    collection(getFirestoreDb(), "wedding_collaborator_invites"),
    where("phone", "==", normalized),
    where("status", "==", "pending")
  )
  const snap = await getDocs(q)
  return snap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as FirestoreCollaboratorInvite
  )
}

export async function createCollaboratorInvite(input: {
  weddingId: string
  phone: string
  invitedByUid: string
  invitedByName: string
  weddingName: string
}): Promise<string> {
  const phone = normalizeCollaboratorPhone(input.phone)
  if (!phone.startsWith("+") || phone.length < 8) {
    throw new Error("Please enter a valid phone number with country code.")
  }

  const id = inviteDocId(input.weddingId, phone)
  const ref = doc(getFirestoreDb(), "wedding_collaborator_invites", id)
  const existing = await getDoc(ref)
  if (existing.exists()) {
    const data = existing.data() as FirestoreCollaboratorInvite
    if (data.status === "pending") {
      throw new Error("An invite is already pending for this number.")
    }
    if (data.status === "accepted") {
      throw new Error("This number is already a member of your wedding.")
    }
  }

  const invite: FirestoreCollaboratorInvite = {
    id,
    weddingId: input.weddingId,
    phone,
    invitedByUid: input.invitedByUid,
    invitedByName: input.invitedByName,
    weddingName: input.weddingName,
    status: "pending",
    createdAt: Date.now(),
  }
  await setDoc(ref, invite)
  return id
}

export async function cancelCollaboratorInvite(inviteId: string): Promise<void> {
  await updateDoc(doc(getFirestoreDb(), "wedding_collaborator_invites", inviteId), {
    status: "cancelled",
  })
}

export function subscribeCollaboratorInvitesForWedding(
  weddingId: string,
  onData: (invites: FirestoreCollaboratorInvite[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(getFirestoreDb(), "wedding_collaborator_invites"),
    where("weddingId", "==", weddingId)
  )
  return onSnapshot(
    q,
    (snap) => {
      const invites = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as FirestoreCollaboratorInvite)
        .filter((i) => i.status === "pending" || i.status === "accepted")
        .sort((a, b) => b.createdAt - a.createdAt)
      onData(invites)
    },
    (err) => onError?.(err)
  )
}

export function subscribeWeddingMemberProfiles(
  weddingId: string | null,
  ownerId: string | null,
  onData: (members: WeddingMemberProfile[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  if (!weddingId) {
    onData([])
    return () => {}
  }

  return onSnapshot(
    doc(getFirestoreDb(), "weddings", weddingId),
    async (snap) => {
      if (!snap.exists()) {
        onData([])
        return
      }
      const data = snap.data()
      const memberUids = (data.memberUids as string[] | undefined) ?? []
      const weddingOwnerId = ownerId ?? (data.ownerId as string)
      const profiles = await Promise.all(
        memberUids.map(async (uid) => {
          const profile: FirestoreUser | null = await getUserProfile(
            getFirestoreDb(),
            uid
          )
          return {
            uid,
            name: profile?.name ?? "Member",
            phone: profile?.phone ?? "",
            role: uid === weddingOwnerId ? ("owner" as const) : ("collaborator" as const),
          }
        })
      )
      onData(profiles)
    },
    (err) => onError?.(err)
  )
}
