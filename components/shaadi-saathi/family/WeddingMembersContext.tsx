"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  cancelCollaboratorInvite,
  createCollaboratorInvite,
  subscribeCollaboratorInvitesForWedding,
  subscribeWeddingMemberProfiles,
  type WeddingMemberProfile,
} from "@/lib/firebase/collaborators"
import {
  canApproveWeddingPayments,
  getWeddingOwnerDisplayName,
} from "@/lib/firebase/wedding-permissions"
import type { FirestoreCollaboratorInvite } from "@/lib/firebase/types"
import { FREE_LIMITS, PREMIUM_LIMITS } from "@/lib/premium"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import { useWedding } from "@/components/shaadi-saathi/firebase/WeddingContext"

interface WeddingMembersContextValue {
  members: WeddingMemberProfile[]
  pendingInvites: FirestoreCollaboratorInvite[]
  loading: boolean
  memberLimit: number
  canInviteMore: boolean
  /** True when signed-in user is weddings.ownerId */
  isOwner: boolean
  /** Owner-only: approve deposits/balances/disputes */
  canApprovePayments: boolean
  ownerDisplayName: string
  inviteByPhone: (phone: string) => Promise<void>
  cancelInvite: (inviteId: string) => Promise<void>
  getMemberByUid: (uid: string) => WeddingMemberProfile | undefined
  formatAssigneeLabel: (assignee: string, assigneeUid?: string) => string
}

const WeddingMembersContext = createContext<WeddingMembersContextValue | null>(null)

export function WeddingMembersProvider({ children }: { children: ReactNode }) {
  const { weddingId, firebaseUser, familyUser, isFirebaseMode } = useAuth()
  const { wedding } = useWedding()
  const [members, setMembers] = useState<WeddingMemberProfile[]>([])
  const [invites, setInvites] = useState<FirestoreCollaboratorInvite[]>([])
  const [loading, setLoading] = useState(isFirebaseMode)

  const activeWeddingId = weddingId ?? wedding?.id ?? null
  const ownerId = wedding?.ownerId ?? null
  const isPremium = wedding?.isPremium ?? false
  const memberLimit = isPremium ? PREMIUM_LIMITS.maxCollaborators : FREE_LIMITS.maxCollaborators

  useEffect(() => {
    if (!isFirebaseMode || !activeWeddingId) {
      setMembers([])
      setInvites([])
      setLoading(false)
      return
    }

    setLoading(true)
    const unsubMembers = subscribeWeddingMemberProfiles(
      activeWeddingId,
      ownerId,
      (list) => {
        setMembers(list)
        setLoading(false)
      },
      () => setLoading(false)
    )
    const unsubInvites = subscribeCollaboratorInvitesForWedding(
      activeWeddingId,
      setInvites,
      () => {}
    )
    return () => {
      unsubMembers()
      unsubInvites()
    }
  }, [isFirebaseMode, activeWeddingId, ownerId])

  const pendingInvites = useMemo(
    () => invites.filter((i) => i.status === "pending"),
    [invites]
  )

  const canInviteMore = members.length + pendingInvites.length < memberLimit

  const inviteByPhone = useCallback(
    async (phone: string) => {
      if (!activeWeddingId || !firebaseUser?.uid) {
        throw new Error("Sign in to invite family members.")
      }
      if (!canInviteMore) {
        throw new Error(
          isPremium
            ? "You've reached the maximum number of family members."
            : "Upgrade to Premium to invite more family members."
        )
      }
      await createCollaboratorInvite({
        weddingId: activeWeddingId,
        phone,
        invitedByUid: firebaseUser.uid,
        invitedByName: familyUser?.name ?? "Organiser",
        weddingName: wedding?.name ?? familyUser?.weddingName ?? "Your wedding",
      })
    },
    [
      activeWeddingId,
      firebaseUser?.uid,
      canInviteMore,
      isPremium,
      familyUser?.name,
      familyUser?.weddingName,
      wedding?.name,
    ]
  )

  const cancelInvite = useCallback(async (inviteId: string) => {
    await cancelCollaboratorInvite(inviteId)
  }, [])

  const getMemberByUid = useCallback(
    (uid: string) => members.find((m) => m.uid === uid),
    [members]
  )

  const formatAssigneeLabel = useCallback(
    (assignee: string, assigneeUid?: string) => {
      if (assigneeUid) {
        const member = getMemberByUid(assigneeUid)
        return member?.name ?? assignee
      }
      const linked = members.find(
        (m) => m.name.toLowerCase() === assignee.trim().toLowerCase()
      )
      if (linked) return linked.name
      if (assignee && assignee !== "Unassigned") {
        return `${assignee} (unlinked)`
      }
      return assignee || "Unassigned"
    },
    [getMemberByUid, members]
  )

  const canApprovePayments = !isFirebaseMode
    ? true
    : canApproveWeddingPayments(firebaseUser?.uid, wedding)
  const isOwner = !isFirebaseMode ? true : canApprovePayments
  const ownerDisplayName = getWeddingOwnerDisplayName(members, wedding)

  const value = useMemo(
    () => ({
      members,
      pendingInvites,
      loading,
      memberLimit,
      canInviteMore,
      isOwner,
      canApprovePayments,
      ownerDisplayName,
      inviteByPhone,
      cancelInvite,
      getMemberByUid,
      formatAssigneeLabel,
    }),
    [
      members,
      pendingInvites,
      loading,
      memberLimit,
      canInviteMore,
      isOwner,
      canApprovePayments,
      ownerDisplayName,
      inviteByPhone,
      cancelInvite,
      getMemberByUid,
      formatAssigneeLabel,
    ]
  )

  return (
    <WeddingMembersContext.Provider value={value}>
      {children}
    </WeddingMembersContext.Provider>
  )
}

export function useWeddingMembers() {
  const ctx = useContext(WeddingMembersContext)
  if (!ctx) {
    throw new Error("useWeddingMembers must be used within WeddingMembersProvider")
  }
  return ctx
}

export function useWeddingMembersOptional() {
  return useContext(WeddingMembersContext)
}
