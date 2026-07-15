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
import type { EventId } from "@/lib/mockData"
import type { DisputeCategory, InPersonMethod, PaymentPath, CheckInPhoto } from "@/lib/mockPayments"
import {
  MOCK_NOW,
  enrichPaymentWithSchedule,
  createInitialPayment,
  shouldAutoNoShow,
} from "@/lib/mockPayments"
import {
  INITIAL_BOOKINGS,
  VENDORS,
  type VendorBooking,
  type BookingStatus,
  getVendorById,
} from "@/lib/mockVendors"
import { isFirebaseConfigured } from "@/lib/firebase/config"
import {
  createBookingInFirestore,
  subscribeBookingsByWedding,
} from "@/lib/firebase/bookings"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import { useWedding } from "@/components/shaadi-saathi/firebase/WeddingContext"

interface CreateBookingInput {
  vendorId: string
  eventId: EventId
  guestCount?: number
  packageName?: string
  price: number
  note?: string
  paymentPath: PaymentPath
  inPersonMethod?: InPersonMethod
}

interface VendorReliability {
  reliabilityScore: number
  noShowCount: number
  suspended: boolean
}

interface VendorBookingsContextValue {
  bookings: VendorBooking[]
  vendorReliability: Record<string, VendorReliability>
  addBooking: (input: CreateBookingInput) => VendorBooking
  vendorCheckIn: (bookingId: string, photo: CheckInPhoto) => void
  markBalancePaid: (bookingId: string) => void
  processNoShow: (bookingId: string) => void
  reportQualityConcern: (
    bookingId: string,
    data: { description: string; photoName?: string }
  ) => void
  submitDispute: (
    bookingId: string,
    data: { category: DisputeCategory; description: string; evidenceFileName?: string }
  ) => void
  acceptCounterOffer: (bookingId: string) => void
  declineCounterOffer: (bookingId: string) => void
  proposeFamilyCounter: (
    bookingId: string,
    data: { price: number; note?: string }
  ) => void
  getBookingsByEvent: (eventId: EventId) => VendorBooking[]
  getBookingsByStatus: (status: BookingStatus) => VendorBooking[]
}

const VendorBookingsContext = createContext<VendorBookingsContextValue | null>(null)

function buildReliabilityMap(): Record<string, VendorReliability> {
  const map: Record<string, VendorReliability> = {}
  for (const v of VENDORS) {
    const normalized = getVendorById(v.id)
    if (normalized) {
      map[v.id] = {
        reliabilityScore: normalized.reliabilityScore ?? 90,
        noShowCount: normalized.noShowCount ?? 0,
        suspended: normalized.suspended ?? false,
      }
    }
  }
  // Sync vendor-14 from demo no-show booking
  if (map["vendor-14"]) {
    map["vendor-14"] = {
      reliabilityScore: 72,
      noShowCount: 1,
      suspended: false,
    }
  }
  return map
}

export function VendorBookingsProvider({ children }: { children: ReactNode }) {
  const { weddingId: authWeddingId, familyUser } = useAuth()
  const { weddingId: ctxWeddingId, wedding } = useWedding()
  const firebaseMode = isFirebaseConfigured()
  const weddingId = authWeddingId ?? ctxWeddingId
  const useFirestore = firebaseMode && Boolean(weddingId)

  // Firebase mode starts empty and is filled only by the current wedding's
  // Firestore bookings. Local/mock mode keeps the demo bookings.
  const [bookings, setBookings] = useState<VendorBooking[]>(
    firebaseMode ? [] : INITIAL_BOOKINGS
  )
  const [vendorReliability, setVendorReliability] = useState(buildReliabilityMap)

  // Subscribe to this wedding's bookings. We reconcile by keeping any existing
  // in-memory booking (which may carry optimistic payment-lifecycle state) and
  // only introducing newly-created / dropping deleted documents.
  useEffect(() => {
    if (!firebaseMode) return
    if (!weddingId) {
      setBookings([])
      return
    }
    const unsub = subscribeBookingsByWedding(
      weddingId,
      (list) => {
        setBookings((prev) => {
          const prevById = new Map(prev.map((b) => [b.id, b]))
          return list.map((fs) => prevById.get(fs.id) ?? fs)
        })
      },
      () => {}
    )
    return unsub
  }, [firebaseMode, weddingId])

  const flagVendorNoShow = useCallback((vendorId: string) => {
    setVendorReliability((prev) => {
      const current = prev[vendorId] ?? {
        reliabilityScore: 90,
        noShowCount: 0,
        suspended: false,
      }
      const noShowCount = current.noShowCount + 1
      return {
        ...prev,
        [vendorId]: {
          reliabilityScore: Math.max(40, current.reliabilityScore - 15),
          noShowCount,
          suspended: noShowCount >= 2,
        },
      }
    })
  }, [])

  const processNoShow = useCallback(
    (bookingId: string) => {
      setBookings((prev) =>
        prev.map((b) => {
          if (b.id !== bookingId || !b.payment) return b
          flagVendorNoShow(b.vendorId)
          return {
            ...b,
            status: "no_show" as const,
            payment: {
              ...b.payment,
              depositStatus: "refunded",
              refundAmount: b.payment.depositAmount,
              refundConfirmedAt: MOCK_NOW.toISOString(),
            },
          }
        })
      )
    },
    [flagVendorNoShow]
  )

  // Auto no-show when grace period expires (mock cron — use Convex scheduler in production)
  useEffect(() => {
    for (const booking of bookings) {
      if (booking.status !== "confirmed" || !booking.payment) continue
      if (shouldAutoNoShow(booking.payment, MOCK_NOW)) {
        processNoShow(booking.id)
      }
    }
  }, [bookings, processNoShow])

  const addBooking = useCallback(
    (input: CreateBookingInput) => {
      const id = `booking-${Date.now()}`
      const payment = enrichPaymentWithSchedule(
        createInitialPayment(input.price, input.paymentPath, input.inPersonMethod),
        input.eventId
      )

      const booking: VendorBooking = {
        id,
        vendorId: input.vendorId,
        eventId: input.eventId,
        status: "confirmed",
        guestCount: input.guestCount,
        packageName: input.packageName,
        price: input.price,
        note: input.note,
        createdAt: MOCK_NOW.toISOString().slice(0, 10),
        payment,
      }
      setBookings((prev) => [booking, ...prev])

      // Persist to Firestore, scoped to this wedding, so it survives reloads
      // and only ever belongs to the current account.
      if (useFirestore && weddingId) {
        const vendor = getVendorById(input.vendorId)
        void createBookingInFirestore({
          id,
          weddingId,
          vendorId: input.vendorId,
          eventId: input.eventId,
          status: "confirmed",
          price: input.price,
          paymentPath: input.paymentPath,
          familyName: familyUser?.name ?? "",
          weddingName: wedding?.name ?? familyUser?.weddingName ?? "",
          vendorName: vendor?.name ?? "Vendor",
          ...(input.packageName ? { packageName: input.packageName } : {}),
          ...(input.guestCount != null ? { guestCount: input.guestCount } : {}),
          ...(input.note ? { note: input.note } : {}),
        })
      }
      return booking
    },
    [useFirestore, weddingId, familyUser, wedding]
  )

  const vendorCheckIn = useCallback((bookingId: string, photo: CheckInPhoto) => {
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id !== bookingId || !b.payment) return b
        const checkInAt = MOCK_NOW.toISOString()
        const updatedPayment = {
          ...b.payment,
          checkInAt,
          checkInStatus: "confirmed" as const,
          checkInPhoto: photo,
          depositStatus: "released" as const,
          balanceStatus:
            b.payment.paymentPath === "online" && b.payment.balanceStatus === "pending_online"
              ? ("charged_pending_release" as const)
              : b.payment.balanceStatus,
          balanceChargedAt:
            b.payment.paymentPath === "online" ? checkInAt : b.payment.balanceChargedAt,
        }
        return { ...b, payment: updatedPayment }
      })
    )
  }, [])

  const reportQualityConcern = useCallback(
    (bookingId: string, data: { description: string; photoName?: string }) => {
      setBookings((prev) =>
        prev.map((b) => {
          if (b.id !== bookingId || !b.payment) return b
          return {
            ...b,
            payment: {
              ...b.payment,
              checkInStatus: "issue_reported" as const,
              depositStatus: "held" as const,
              qualityConcern: {
                status: "under_review" as const,
                description: data.description,
                photoName: data.photoName,
                reportedAt: MOCK_NOW.toISOString(),
              },
            },
          }
        })
      )
    },
    []
  )

  const markBalancePaid = useCallback((bookingId: string) => {
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id !== bookingId || !b.payment) return b
        return {
          ...b,
          payment: {
            ...b.payment,
            balanceStatus:
              b.payment.paymentPath === "online"
                ? "released_online"
                : "paid_in_person",
            balanceMarkedPaidAt: MOCK_NOW.toISOString(),
          },
        }
      })
    )
  }, [])

  const submitDispute = useCallback(
    (
      bookingId: string,
      data: { category: DisputeCategory; description: string; evidenceFileName?: string }
    ) => {
      setBookings((prev) =>
        prev.map((b) => {
          if (b.id !== bookingId || !b.payment) return b
          return {
            ...b,
            payment: {
              ...b.payment,
              dispute: {
                status: "under_review",
                category: data.category,
                description: data.description,
                evidenceFileName: data.evidenceFileName,
                submittedAt: MOCK_NOW.toISOString(),
              },
            },
          }
        })
      )
    },
    []
  )

  const acceptCounterOffer = useCallback((bookingId: string) => {
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id !== bookingId || !b.counterOffer) return b
        const price = b.counterOffer.price
        const payment = enrichPaymentWithSchedule(
          createInitialPayment(price, "in_person", "cash"),
          b.eventId
        )
        return {
          ...b,
          status: "confirmed" as const,
          price,
          packageName: b.counterOffer.packageName ?? b.packageName,
          counterOffer: undefined,
          payment,
        }
      })
    )
  }, [])

  const declineCounterOffer = useCallback((bookingId: string) => {
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId ? { ...b, status: "declined" as const, counterOffer: undefined } : b
      )
    )
  }, [])

  const proposeFamilyCounter = useCallback(
    (bookingId: string, data: { price: number; note?: string }) => {
      setBookings((prev) =>
        prev.map((b) => {
          if (b.id !== bookingId) return b
          const round = (b.negotiationRound ?? 0) + 1
          if (round > 2) return b
          return {
            ...b,
            negotiationRound: round,
            counterOffer: {
              price: data.price,
              note: data.note,
              proposedAt: MOCK_NOW.toISOString().slice(0, 10),
              proposedBy: "family" as const,
            },
          }
        })
      )
    },
    []
  )

  const getBookingsByEvent = useCallback(
    (eventId: EventId) => bookings.filter((b) => b.eventId === eventId),
    [bookings]
  )

  const getBookingsByStatus = useCallback(
    (status: BookingStatus) => bookings.filter((b) => b.status === status),
    [bookings]
  )

  const value = useMemo(
    () => ({
      bookings,
      vendorReliability,
      addBooking,
      vendorCheckIn,
      markBalancePaid,
      processNoShow,
      reportQualityConcern,
      submitDispute,
      acceptCounterOffer,
      declineCounterOffer,
      proposeFamilyCounter,
      getBookingsByEvent,
      getBookingsByStatus,
    }),
    [
      bookings,
      vendorReliability,
      addBooking,
      vendorCheckIn,
      markBalancePaid,
      processNoShow,
      reportQualityConcern,
      submitDispute,
      acceptCounterOffer,
      declineCounterOffer,
      proposeFamilyCounter,
      getBookingsByEvent,
      getBookingsByStatus,
    ]
  )

  return (
    <VendorBookingsContext.Provider value={value}>
      {children}
    </VendorBookingsContext.Provider>
  )
}

export function useVendorBookings() {
  const ctx = useContext(VendorBookingsContext)
  if (!ctx) {
    throw new Error("useVendorBookings must be used within VendorBookingsProvider")
  }
  return ctx
}
