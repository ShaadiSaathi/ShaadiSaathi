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
  getVendorById as getMockVendorById,
} from "@/lib/mockVendors"
import { subscribeBookingsByWedding, setBookingCounterOffer, setBookingDispute, clearBookingCounterOffer, updateBookingFields } from "@/lib/firebase/bookings"
import { confirmBookingApi, createBookingApi } from "@/lib/firebase/bookings-client"
import { getVendor } from "@/lib/firebase/vendors"
import { disputeVendorResponseDeadlineAt } from "@/lib/automation/constants"
import {
  createNotification,
  formatDisputeRaisedMessage,
  formatQuoteDecisionMessage,
} from "@/lib/firebase/notifications"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import { useWedding } from "@/components/shaadi-saathi/firebase/WeddingContext"
import { useVendorsDirectory } from "@/components/shaadi-saathi/vendors/VendorsDirectoryContext"
import { EVENTS } from "@/lib/mockData"

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
  addBooking: (input: CreateBookingInput) => Promise<VendorBooking>
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
  ) => void | Promise<void>
  acceptCounterOffer: (bookingId: string) => void | Promise<void>
  declineCounterOffer: (bookingId: string) => void | Promise<void>
  proposeFamilyCounter: (
    bookingId: string,
    data: { price: number; note?: string }
  ) => void | Promise<void>
  getBookingsByEvent: (eventId: EventId) => VendorBooking[]
  getBookingsByStatus: (status: BookingStatus) => VendorBooking[]
}

const VendorBookingsContext = createContext<VendorBookingsContextValue | null>(null)

function buildReliabilityMap(
  vendors: { id: string; reliabilityScore?: number; noShowCount?: number; suspended?: boolean }[]
): Record<string, VendorReliability> {
  const map: Record<string, VendorReliability> = {}
  for (const v of vendors) {
    map[v.id] = {
      reliabilityScore: v.reliabilityScore ?? 90,
      noShowCount: v.noShowCount ?? 0,
      suspended: v.suspended ?? false,
    }
  }
  return map
}

export function VendorBookingsProvider({ children }: { children: ReactNode }) {
  const { weddingId: authWeddingId, familyUser, isFirebaseMode: firebaseMode, firebaseUser } =
    useAuth()
  const { weddingId: ctxWeddingId, wedding } = useWedding()
  const { vendors, getVendorById } = useVendorsDirectory()
  const weddingId = authWeddingId ?? ctxWeddingId
  const useFirestore = firebaseMode && Boolean(weddingId)

  // Firebase mode starts empty and is filled only by the current wedding's
  // Firestore bookings. Local/mock mode keeps the demo bookings.
  const [bookings, setBookings] = useState<VendorBooking[]>(
    firebaseMode ? [] : INITIAL_BOOKINGS
  )
  const [vendorReliability, setVendorReliability] = useState<
    Record<string, VendorReliability>
  >(() => buildReliabilityMap(firebaseMode ? [] : VENDORS))

  useEffect(() => {
    setVendorReliability((prev) => {
      const next = buildReliabilityMap(vendors)
      // Preserve runtime no-show adjustments for known ids
      for (const [id, rel] of Object.entries(prev)) {
        if (next[id]) {
          next[id] = {
            reliabilityScore: Math.min(next[id].reliabilityScore, rel.reliabilityScore),
            noShowCount: Math.max(next[id].noShowCount, rel.noShowCount),
            suspended: next[id].suspended || rel.suspended,
          }
        } else {
          next[id] = rel
        }
      }
      if (!firebaseMode && next["vendor-14"]) {
        next["vendor-14"] = {
          reliabilityScore: 72,
          noShowCount: 1,
          suspended: false,
        }
      }
      return next
    })
  }, [vendors, firebaseMode])

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
    async (input: CreateBookingInput) => {
      const payment = enrichPaymentWithSchedule(
        createInitialPayment(input.price, input.paymentPath, input.inPersonMethod),
        input.eventId
      )

      // Firebase: create via Admin API so platform-wide date locks are claimed
      // atomically. Client Firestore creates of confirmed bookings are rejected.
      if (useFirestore && weddingId) {
        const vendor = getVendorById(input.vendorId) ?? getMockVendorById(input.vendorId)
        const result = await createBookingApi({
          weddingId,
          vendorId: input.vendorId,
          eventId: input.eventId,
          price: input.price,
          paymentPath: input.paymentPath,
          inPersonMethod: input.inPersonMethod,
          familyName: familyUser?.name ?? "",
          weddingName: wedding?.name ?? familyUser?.weddingName ?? "",
          vendorName: vendor?.name ?? "Vendor",
          ...(input.packageName ? { packageName: input.packageName } : {}),
          ...(input.guestCount != null ? { guestCount: input.guestCount } : {}),
          ...(input.note ? { note: input.note } : {}),
        })

        const booking: VendorBooking = {
          id: result.bookingId,
          vendorId: input.vendorId,
          eventId: input.eventId,
          status: result.status,
          guestCount: input.guestCount,
          packageName: input.packageName,
          price: input.price,
          note: input.note,
          createdAt: MOCK_NOW.toISOString().slice(0, 10),
          payment,
        }
        setBookings((prev) => {
          if (prev.some((b) => b.id === booking.id)) return prev
          return [booking, ...prev]
        })
        return booking
      }

      const id = `booking-${Date.now()}`
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
      return booking
    },
    [useFirestore, weddingId, familyUser, wedding, getVendorById]
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
    async (
      bookingId: string,
      data: { category: DisputeCategory; description: string; evidenceFileName?: string }
    ) => {
      if (useFirestore && weddingId && firebaseUser) {
        const booking = bookings.find((b) => b.id === bookingId)
        const event = EVENTS.find((e) => e.id === booking?.eventId)
        await setBookingDispute(bookingId, {
          status: "under_review",
          category: data.category,
          description: data.description,
          ...(data.evidenceFileName ? { evidenceFileName: data.evidenceFileName } : {}),
          submittedAt: Date.now(),
          vendorResponseDeadlineAt: disputeVendorResponseDeadlineAt(Date.now()),
          familyReason: data.description,
        })
        const vendor = booking ? await getVendor(booking.vendorId) : null
        const recipientUid = vendor?.ownerUid
        if (recipientUid && recipientUid !== firebaseUser.uid) {
          await createNotification({
            recipientUid,
            weddingId,
            type: "dispute_raised",
            message: formatDisputeRaisedMessage(
              familyUser?.name || wedding?.name || "A family",
              wedding?.name || familyUser?.weddingName || "their wedding",
              event?.name ?? booking?.eventId ?? "an event"
            ),
            bookingId,
            href: `/vendor/jobs/${bookingId}`,
            actorUid: firebaseUser.uid,
            actorName: familyUser?.name,
          })
        }
        return
      }
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
    [useFirestore, weddingId, firebaseUser, bookings, familyUser, wedding]
  )

  const acceptCounterOffer = useCallback(
    async (bookingId: string) => {
      if (useFirestore && weddingId && firebaseUser) {
        const booking = bookings.find((b) => b.id === bookingId)
        const price = booking?.counterOffer?.price ?? booking?.price
        await confirmBookingApi(bookingId, {
          clearCounterOffer: true,
          ...(price != null ? { price } : {}),
          ...(booking?.counterOffer?.packageName
            ? { packageName: booking.counterOffer.packageName }
            : {}),
        })
        const vendor = booking ? await getVendor(booking.vendorId) : null
        if (vendor?.ownerUid && vendor.ownerUid !== firebaseUser.uid) {
          await createNotification({
            recipientUid: vendor.ownerUid,
            weddingId,
            type: "quote_accepted",
            message: formatQuoteDecisionMessage(
              familyUser?.name || "The family",
              wedding?.name || familyUser?.weddingName || "their wedding",
              true
            ),
            bookingId,
            href: `/vendor/jobs/${bookingId}`,
            actorUid: firebaseUser.uid,
            actorName: familyUser?.name,
          })
        }
        return
      }
      setBookings((prev) =>
        prev.map((b) => {
          if (b.id !== bookingId || !b.counterOffer) return b
          const nextPrice = b.counterOffer.price
          const payment = enrichPaymentWithSchedule(
            createInitialPayment(nextPrice, "in_person", "cash"),
            b.eventId
          )
          return {
            ...b,
            status: "confirmed" as const,
            price: nextPrice,
            packageName: b.counterOffer.packageName ?? b.packageName,
            counterOffer: undefined,
            payment,
          }
        })
      )
    },
    [useFirestore, weddingId, firebaseUser, bookings, familyUser, wedding]
  )

  const declineCounterOffer = useCallback(
    async (bookingId: string) => {
      if (useFirestore && weddingId && firebaseUser) {
        const booking = bookings.find((b) => b.id === bookingId)
        await clearBookingCounterOffer(bookingId, {
          status: "declined",
        })
        const vendor = booking ? await getVendor(booking.vendorId) : null
        if (vendor?.ownerUid && vendor.ownerUid !== firebaseUser.uid) {
          await createNotification({
            recipientUid: vendor.ownerUid,
            weddingId,
            type: "quote_rejected",
            message: formatQuoteDecisionMessage(
              familyUser?.name || "The family",
              wedding?.name || familyUser?.weddingName || "their wedding",
              false
            ),
            bookingId,
            href: "/vendor/requests",
            actorUid: firebaseUser.uid,
            actorName: familyUser?.name,
          })
        }
        return
      }
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId
            ? { ...b, status: "declined" as const, counterOffer: undefined }
            : b
        )
      )
    },
    [useFirestore, weddingId, firebaseUser, bookings, familyUser, wedding]
  )

  const proposeFamilyCounter = useCallback(
    async (bookingId: string, data: { price: number; note?: string }) => {
      if (useFirestore && weddingId && firebaseUser) {
        await setBookingCounterOffer(bookingId, {
          price: data.price,
          ...(data.note ? { note: data.note } : {}),
          proposedAt: Date.now(),
          proposedBy: "family",
        })
        const booking = bookings.find((b) => b.id === bookingId)
        const vendor = booking ? await getVendor(booking.vendorId) : null
        if (vendor?.ownerUid && vendor.ownerUid !== firebaseUser.uid) {
          await createNotification({
            recipientUid: vendor.ownerUid,
            weddingId,
            type: "quote_received",
            message: `${familyUser?.name || "The family"} sent a counter-offer for ${
              wedding?.name || "their wedding"
            }`,
            bookingId,
            href: "/vendor/requests",
            actorUid: firebaseUser.uid,
            actorName: familyUser?.name,
          })
        }
        return
      }
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
    [useFirestore, weddingId, firebaseUser, bookings, familyUser, wedding]
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
