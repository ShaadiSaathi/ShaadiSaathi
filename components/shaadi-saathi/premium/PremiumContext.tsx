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
import { FAMILY_MEMBERS, type FamilyMember } from "@/lib/mockData"
import {
  type InviteThemeId,
  type SeatingAssignment,
  type VendorSubscriptionTier,
  type CustomEvent,
  FREE_LIMITS,
} from "@/lib/premium"
import type { VendorCategoryId } from "@/lib/mockVendors"
import { isFirebaseConfigured } from "@/lib/firebase/config"
import { updateWeddingInviteTheme, updateWeddingPremium } from "@/lib/firebase/weddings"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import { useWedding } from "@/components/shaadi-saathi/firebase/WeddingContext"

// Re-export mock delay from auth validation pattern
async function mockPaymentDelay(ms = 1200): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

interface PremiumContextValue {
  // Family wedding premium (one-time)
  isFamilyPremium: boolean
  inviteTheme: InviteThemeId
  setInviteTheme: (theme: InviteThemeId) => void
  purchaseFamilyPremium: () => Promise<void>
  showPremiumConfirmation: boolean
  dismissPremiumConfirmation: () => void
  collaborators: FamilyMember[]
  addCollaborator: (name: string) => boolean
  seating: SeatingAssignment[]
  assignGuestToTable: (guestId: string, tableNumber: number) => void
  extraEvents: CustomEvent[]
  addExtraEvent: (name: string, date: string) => boolean
  // Vendor subscription (monthly)
  vendorTier: VendorSubscriptionTier
  vendorCategories: VendorCategoryId[]
  setVendorCategories: (categories: VendorCategoryId[]) => void
  nextBillingDate: string | null
  subscribeVendorFeatured: () => Promise<void>
  cancelVendorSubscription: () => void
  showVendorConfirmation: boolean
  dismissVendorConfirmation: () => void
}

const PremiumContext = createContext<PremiumContextValue | null>(null)

const STORAGE_KEY = "shaadi-saathi-premium"

interface StoredPremium {
  isFamilyPremium: boolean
  inviteTheme: InviteThemeId
  collaborators: FamilyMember[]
  seating: SeatingAssignment[]
  extraEvents: CustomEvent[]
  vendorTier: VendorSubscriptionTier
  vendorCategories: VendorCategoryId[]
  nextBillingDate: string | null
}

function loadStored(): Partial<StoredPremium> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Partial<StoredPremium>) : {}
  } catch {
    return {}
  }
}

function persist(state: StoredPremium) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function PremiumProvider({ children }: { children: ReactNode }) {
  const { weddingId: authWeddingId } = useAuth()
  const { wedding, weddingId: ctxWeddingId } = useWedding()
  const weddingId = authWeddingId ?? ctxWeddingId
  const [hydrated, setHydrated] = useState(false)
  const [isFamilyPremium, setIsFamilyPremium] = useState(false)
  const [inviteTheme, setInviteThemeState] = useState<InviteThemeId>("classic")
  const [collaborators, setCollaborators] = useState<FamilyMember[]>(FAMILY_MEMBERS.slice(0, 2))
  const [seating, setSeating] = useState<SeatingAssignment[]>([])
  const [extraEvents, setExtraEvents] = useState<CustomEvent[]>([])
  const [vendorTier, setVendorTier] = useState<VendorSubscriptionTier>("basic")
  const [vendorCategories, setVendorCategories] = useState<VendorCategoryId[]>(["catering"])
  const [nextBillingDate, setNextBillingDate] = useState<string | null>(null)
  const [showPremiumConfirmation, setShowPremiumConfirmation] = useState(false)
  const [showVendorConfirmation, setShowVendorConfirmation] = useState(false)

  useEffect(() => {
    const stored = loadStored()
    if (stored.isFamilyPremium !== undefined) setIsFamilyPremium(stored.isFamilyPremium)
    if (stored.inviteTheme) setInviteThemeState(stored.inviteTheme)
    if (stored.collaborators) setCollaborators(stored.collaborators)
    if (stored.seating) setSeating(stored.seating)
    if (stored.extraEvents) setExtraEvents(stored.extraEvents)
    if (stored.vendorTier) setVendorTier(stored.vendorTier)
    if (stored.vendorCategories) setVendorCategories(stored.vendorCategories)
    if (stored.nextBillingDate !== undefined) setNextBillingDate(stored.nextBillingDate)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    persist({
      isFamilyPremium,
      inviteTheme,
      collaborators,
      seating,
      extraEvents,
      vendorTier,
      vendorCategories,
      nextBillingDate,
    })
  }, [
    hydrated,
    isFamilyPremium,
    inviteTheme,
    collaborators,
    seating,
    extraEvents,
    vendorTier,
    vendorCategories,
    nextBillingDate,
  ])

  useEffect(() => {
    if (!isFirebaseConfigured() || !hydrated || !wedding) return
    setIsFamilyPremium(wedding.isPremium)
    setInviteThemeState(wedding.inviteTheme)
  }, [wedding?.id, wedding?.isPremium, wedding?.inviteTheme, hydrated])

  const setInviteTheme = useCallback(
    async (theme: InviteThemeId) => {
      if (theme !== "classic" && !isFamilyPremium) return
      setInviteThemeState(theme)
      if (isFirebaseConfigured() && weddingId) {
        await updateWeddingInviteTheme(weddingId, theme)
      }
    },
    [isFamilyPremium, weddingId]
  )

  const purchaseFamilyPremium = useCallback(async () => {
    await mockPaymentDelay()
    setIsFamilyPremium(true)
    if (isFirebaseConfigured() && weddingId) {
      await updateWeddingPremium(weddingId, true)
    }
    setShowPremiumConfirmation(true)
  }, [weddingId])

  const subscribeVendorFeatured = useCallback(async () => {
    // TODO: real payment integration here (recurring subscription)
    await mockPaymentDelay()
    setVendorTier("featured")
    const next = new Date()
    next.setMonth(next.getMonth() + 1)
    setNextBillingDate(next.toISOString().slice(0, 10))
    setShowVendorConfirmation(true)
  }, [])

  const cancelVendorSubscription = useCallback(() => {
    setVendorTier("basic")
    setNextBillingDate(null)
    setVendorCategories((prev) => [prev[0] ?? "catering"])
  }, [])

  const setVendorCategoriesList = useCallback((categories: VendorCategoryId[]) => {
    if (vendorTier !== "featured") return
    setVendorCategories(categories.slice(0, 3))
  }, [vendorTier])

  const addCollaborator = useCallback(
    (name: string): boolean => {
      const max = isFamilyPremium ? 8 : 2
      if (collaborators.length >= max) return false
      const initials = name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
      setCollaborators((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          name: name.trim(),
          role: "planner",
          initials,
        },
      ])
      return true
    },
    [collaborators.length, isFamilyPremium]
  )

  const assignGuestToTable = useCallback((guestId: string, tableNumber: number) => {
    setSeating((prev) => {
      const filtered = prev.filter((s) => s.guestId !== guestId)
      if (tableNumber <= 0) return filtered
      return [...filtered, { guestId, tableNumber }]
    })
  }, [])

  const addExtraEvent = useCallback(
    (name: string, date: string): boolean => {
      const totalEvents = 3 + extraEvents.length
      if (!isFamilyPremium && totalEvents >= FREE_LIMITS.maxEvents) return false
      setExtraEvents((prev) => [
        ...prev,
        { id: `custom-${Date.now()}`, name: name.trim(), date },
      ])
      return true
    },
    [extraEvents.length, isFamilyPremium]
  )

  const value = useMemo(
    () => ({
      isFamilyPremium,
      inviteTheme,
      setInviteTheme,
      purchaseFamilyPremium,
      showPremiumConfirmation,
      dismissPremiumConfirmation: () => setShowPremiumConfirmation(false),
      collaborators,
      addCollaborator,
      seating,
      assignGuestToTable,
      extraEvents,
      addExtraEvent,
      vendorTier,
      vendorCategories,
      setVendorCategories: setVendorCategoriesList,
      nextBillingDate,
      subscribeVendorFeatured,
      cancelVendorSubscription,
      showVendorConfirmation,
      dismissVendorConfirmation: () => setShowVendorConfirmation(false),
    }),
    [
      isFamilyPremium,
      inviteTheme,
      setInviteTheme,
      purchaseFamilyPremium,
      showPremiumConfirmation,
      collaborators,
      addCollaborator,
      seating,
      assignGuestToTable,
      extraEvents,
      addExtraEvent,
      vendorTier,
      vendorCategories,
      setVendorCategoriesList,
      nextBillingDate,
      subscribeVendorFeatured,
      cancelVendorSubscription,
      showVendorConfirmation,
    ]
  )

  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>
}

export function usePremium() {
  const ctx = useContext(PremiumContext)
  if (!ctx) throw new Error("usePremium must be used within PremiumProvider")
  return ctx
}
