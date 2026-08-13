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
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import { usePremium } from "@/components/shaadi-saathi/premium/PremiumContext"
import { getCategoryById } from "@/lib/mockVendors"
import { EVENTS } from "@/lib/mockData"
import { MOCK_NOW, createInitialPayment, type BookingPayment, type CheckInPhoto } from "@/lib/mockPayments"
import {
  CURRENT_VENDOR,
  INITIAL_BOOKING_REQUESTS,
  INITIAL_VENDOR_JOBS,
  buildEarningsFromJobs,
  requestToJob,
  type BookingRequest,
  type VendorBusiness,
  type VendorJob,
  type VendorJobStatus,
} from "@/lib/mockVendorPortal"
import { subscribeBookingsByVendor, setBookingCounterOffer, setBookingExtraWorkRequest, updateBookingFields, updateBookingStatus } from "@/lib/firebase/bookings"
import { getVendor, submitVendorVerification } from "@/lib/firebase/vendors"
import { getVendorKyc } from "@/lib/firebase/vendor-kyc"
import {
  createNotification,
  formatDisputeVendorResponseMessage,
  formatExtraWorkNeededMessage,
  formatQuoteReceivedMessage,
} from "@/lib/firebase/notifications"
import type { FirestoreBooking } from "@/lib/firebase/types"
import type { VendorVerificationStatus } from "@/lib/firebase/vendor-verification"
import { formatPrice } from "@/lib/mockVendors"

interface VendorPortalContextValue {
  business: VendorBusiness
  requests: BookingRequest[]
  jobs: VendorJob[]
  earnings: ReturnType<typeof buildEarningsFromJobs>
  acceptRequest: (id: string) => void
  declineRequest: (id: string) => void
  proposeCounterOffer: (
    id: string,
    data: { price: number; packageName?: string; note?: string }
  ) => void | Promise<void>
  vendorCheckIn: (jobId: string, photo: CheckInPhoto) => void
  markJobCompleted: (jobId: string) => void
  submitDisputeResponse: (jobId: string, response: string) => void | Promise<void>
  requestExtraWork: (
    jobId: string,
    data: { description: string; estimatedAmount?: number }
  ) => Promise<void>
  updateIncidentResponse: (incidentId: string, response: string) => void
  updateBusiness: (updates: Partial<VendorBusiness>) => void
  refreshBusiness: () => Promise<void>
  submitVerification: (input: {
    cnic: string
    businessName: string
    city: string
  }) => Promise<VendorVerificationStatus>
}

const VendorPortalContext = createContext<VendorPortalContextValue | null>(null)

function bookingToJob(b: FirestoreBooking): VendorJob {
  const event = EVENTS.find((e) => e.id === b.eventId)
  const jobStatus: VendorJobStatus =
    b.status === "completed"
      ? "completed"
      : b.status === "disputed"
        ? "disputed"
        : "upcoming"

  return {
    id: b.id,
    familyName: b.familyName || "Family",
    weddingName: b.weddingName || "Wedding",
    familyPhone: "",
    eventId: b.eventId,
    eventName: event?.name ?? b.eventId,
    eventDate: b.eventDate || event?.date || "",
    eventTime: event?.time ?? "",
    venue: event?.venue ?? "",
    venueAddress: event?.address ?? "",
    guestCount: b.guestCount,
    packageName: b.packageName,
    price: b.price,
    jobStatus,
    payment: firestorePaymentToUi(b),
    disputeFamilyMessage: b.dispute?.description || b.dispute?.familyReason,
    disputeVendorResponse: b.dispute?.vendorResponse,
  }
}

function bookingToRequest(b: FirestoreBooking): BookingRequest {
  const event = EVENTS.find((e) => e.id === b.eventId)
  return {
    id: b.id,
    familyName: b.familyName || "Family",
    weddingName: b.weddingName || "Wedding",
    eventId: b.eventId,
    eventName: event?.name ?? b.eventId,
    eventDate: b.eventDate || event?.date || "",
    venue: event?.venue ?? "",
    guestCount: b.guestCount,
    packageName: b.packageName,
    proposedPrice: b.price,
    note: b.note,
    status: b.counterOffer ? "awaiting_family_response" : "pending",
    receivedAt: new Date(b.createdAt).toISOString().slice(0, 10),
    paymentPath: b.paymentPath,
    ...(b.counterOffer
      ? {
          counterOffer: {
            price: b.counterOffer.price,
            packageName: b.counterOffer.packageName,
            note: b.counterOffer.note,
            proposedAt: new Date(b.counterOffer.proposedAt).toISOString().slice(0, 10),
            proposedBy: b.counterOffer.proposedBy,
          },
        }
      : {}),
  }
}

function msToIso(value: number | undefined): string | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined
  return new Date(value).toISOString()
}

/** Map Firestore payment (incl. Safepay payout fields) onto the vendor UI model. */
function firestorePaymentToUi(b: FirestoreBooking): BookingPayment {
  const path = b.paymentPath ?? b.payment?.paymentPath ?? "in_person"
  const base = createInitialPayment(b.price, path)
  const p = b.payment
  if (!p) return base

  return {
    ...base,
    totalPrice: p.totalPrice ?? base.totalPrice,
    depositAmount: p.depositAmount ?? base.depositAmount,
    depositPercent: p.depositPercent ?? base.depositPercent,
    balanceAmount: p.balanceAmount ?? base.balanceAmount,
    paymentPath: p.paymentPath ?? path,
    inPersonMethod: p.inPersonMethod,
    depositStatus: p.depositStatus ?? base.depositStatus,
    balanceStatus: p.balanceStatus ?? base.balanceStatus,
    depositPaidAt: msToIso(p.depositPaidAt) ?? base.depositPaidAt,
    checkInAt: msToIso(p.checkInAt),
    balanceMarkedPaidAt: msToIso(p.balanceMarkedPaidAt),
    balanceChargedAt: msToIso(p.balanceChargedAt),
    refundAmount: p.refundAmount,
    refundConfirmedAt: msToIso(p.refundConfirmedAt),
    safepayPayoutStatus: p.safepayPayoutStatus,
    safepayPayoutError: p.safepayPayoutError,
    safepayPayoutAttemptedAt: msToIso(p.safepayPayoutAttemptedAt),
  }
}

/** Vendor portal — Firebase vendors load real bookings as My Jobs (same source of truth as conflict checks). */
export function VendorPortalProvider({ children }: { children: ReactNode }) {
  const { vendorUser, vendorId, isFirebaseMode, firebaseUser } = useAuth()
  const { vendorTier } = usePremium()
  const [business, setBusiness] = useState<VendorBusiness>(CURRENT_VENDOR)
  const [requests, setRequests] = useState<BookingRequest[]>(INITIAL_BOOKING_REQUESTS)
  const [jobs, setJobs] = useState<VendorJob[]>(
    isFirebaseMode ? [] : INITIAL_VENDOR_JOBS
  )

  useEffect(() => {
    if (!vendorUser) return
    const category = getCategoryById(vendorUser.categoryId)
    setBusiness((prev) => ({
      ...prev,
      id: vendorId || prev.id,
      name: vendorUser.businessName,
      categoryId: vendorUser.categoryId,
      categoryLabel: category?.label ?? prev.categoryLabel,
      city: vendorUser.city,
      phone: `+92 ${vendorUser.phone.slice(0, 3)} ${vendorUser.phone.slice(3, 6)} ${vendorUser.phone.slice(6)}`,
      bio: vendorUser.bio || prev.bio,
      verificationStatus: isFirebaseMode ? prev.verificationStatus ?? "unverified" : "verified",
    }))
  }, [vendorUser, vendorId, isFirebaseMode])

  const refreshBusiness = useCallback(async () => {
    if (!isFirebaseMode || !vendorId) return
    const vendor = await getVendor(vendorId)
    if (!vendor) return
    const kyc = await getVendorKyc(vendorId)
    const category = getCategoryById(vendor.categoryId)
    setBusiness((prev) => ({
      ...prev,
      id: vendor.id,
      name: vendor.businessName,
      categoryId: vendor.categoryId,
      categoryLabel: category?.label ?? prev.categoryLabel,
      city: vendor.city,
      bio: vendor.bio || prev.bio,
      email: vendor.email || prev.email,
      verificationStatus: vendor.verificationStatus ?? "unverified",
      verificationCnic: kyc?.verificationCnic ?? vendor.verificationCnic,
      verificationBusinessName:
        kyc?.verificationBusinessName ?? vendor.verificationBusinessName,
      verificationCity: kyc?.verificationCity ?? vendor.verificationCity,
      verificationSubmittedAt: vendor.verificationSubmittedAt,
      verificationRejectionReason: vendor.verificationRejectionReason,
      completedJobsCount: vendor.completedJobsCount ?? prev.completedJobsCount,
      suspended: vendor.suspended ?? prev.suspended,
      reliabilityScore: vendor.reliabilityScore ?? prev.reliabilityScore,
    }))
  }, [isFirebaseMode, vendorId])

  useEffect(() => {
    void refreshBusiness()
  }, [refreshBusiness])

  useEffect(() => {
    setBusiness((prev) => ({
      ...prev,
      subscriptionTier: vendorTier,
    }))
  }, [vendorTier])

  const submitVerification = useCallback(
    async (input: { cnic: string; businessName: string; city: string }) => {
      if (!isFirebaseMode || !vendorId || !firebaseUser) {
        throw new Error("Sign in as a vendor to submit verification")
      }
      const status = await submitVendorVerification(vendorId, firebaseUser.uid, input)
      await refreshBusiness()
      return status
    },
    [firebaseUser, isFirebaseMode, refreshBusiness, vendorId]
  )

  // Same `bookings` collection families write — keeps My Jobs in sync with date locks.
  useEffect(() => {
    if (!isFirebaseMode || !vendorId) {
      if (!isFirebaseMode) {
        setJobs(INITIAL_VENDOR_JOBS)
        setRequests(INITIAL_BOOKING_REQUESTS)
      }
      return
    }
    return subscribeBookingsByVendor(
      vendorId,
      (bookings) => {
        const confirmed = bookings.filter(
          (b) =>
            b.status === "confirmed" ||
            b.status === "completed" ||
            b.status === "disputed"
        )
        const pending = bookings.filter(
          (b) => b.status === "requested" || Boolean(b.counterOffer)
        )
        setJobs(confirmed.map(bookingToJob))
        setRequests(pending.map(bookingToRequest))
      },
      (err) => {
        console.error("vendor jobs subscribe failed", err)
      }
    )
  }, [isFirebaseMode, vendorId])

  const acceptRequest = useCallback(
    async (id: string) => {
      if (isFirebaseMode) {
        await updateBookingStatus(id, "confirmed")
        return
      }
      setRequests((prev) => {
        const req = prev.find((r) => r.id === id)
        if (!req) return prev
        const job = requestToJob({ ...req, status: "accepted" })
        setJobs((j) => [job, ...j])
        return prev.filter((r) => r.id !== id)
      })
    },
    [isFirebaseMode]
  )

  const declineRequest = useCallback(
    async (id: string) => {
      if (isFirebaseMode) {
        await updateBookingStatus(id, "declined")
        return
      }
      setRequests((prev) => prev.filter((r) => r.id !== id))
    },
    [isFirebaseMode]
  )

  const proposeCounterOffer = useCallback(
    async (id: string, data: { price: number; packageName?: string; note?: string }) => {
      if (isFirebaseMode && firebaseUser) {
        const booking = await (
          await import("@/lib/firebase/bookings")
        ).getBooking(id)
        if (!booking) throw new Error("Booking not found")
        await setBookingCounterOffer(
          id,
          {
            price: data.price,
            ...(data.packageName ? { packageName: data.packageName } : {}),
            ...(data.note ? { note: data.note } : {}),
            proposedAt: Date.now(),
            proposedBy: "vendor",
          },
          "requested"
        )
        const recipientUid = booking.createdByUid
        if (recipientUid && recipientUid !== firebaseUser.uid) {
          await createNotification({
            recipientUid,
            weddingId: booking.weddingId,
            type: "quote_received",
            message: formatQuoteReceivedMessage(
              business.name || booking.vendorName,
              booking.weddingName,
              formatPrice(data.price)
            ),
            bookingId: id,
            href: `/vendors/bookings#booking-${id}`,
            actorUid: firebaseUser.uid,
            actorName: business.name,
          })
        }
        return
      }
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: "awaiting_family_response" as const,
                negotiationRound: (r.negotiationRound ?? 0) + 1,
                counterOffer: {
                  price: data.price,
                  packageName: data.packageName,
                  note: data.note,
                  proposedAt: MOCK_NOW.toISOString().slice(0, 10),
                  proposedBy: "vendor" as const,
                },
              }
            : r
        )
      )
    },
    [isFirebaseMode, firebaseUser, business.name]
  )

  const vendorCheckIn = useCallback((jobId: string, photo: CheckInPhoto) => {
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id !== jobId) return j
        const checkInAt = MOCK_NOW.toISOString()
        return {
          ...j,
          jobStatus: j.jobStatus === "awaiting_check_in" ? "upcoming" : j.jobStatus,
          payment: {
            ...j.payment,
            checkInAt,
            checkInStatus: "confirmed" as const,
            checkInPhoto: photo,
            depositStatus: "released",
            balanceStatus:
              j.payment.paymentPath === "online"
                ? "charged_pending_release"
                : j.payment.balanceStatus,
            balanceChargedAt:
              j.payment.paymentPath === "online" ? checkInAt : j.payment.balanceChargedAt,
          },
        }
      })
    )
  }, [])

  const markJobCompleted = useCallback((jobId: string) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? {
              ...j,
              jobStatus: "completed",
              completedAt: MOCK_NOW.toISOString().slice(0, 10),
              payment: {
                ...j.payment,
                balanceStatus:
                  j.payment.paymentPath === "in_person"
                    ? "paid_in_person"
                    : "released_online",
                balanceMarkedPaidAt: MOCK_NOW.toISOString(),
              },
            }
          : j
      )
    )
  }, [])

  const submitDisputeResponse = useCallback(
    async (jobId: string, response: string) => {
      if (isFirebaseMode && firebaseUser) {
        const booking = await (
          await import("@/lib/firebase/bookings")
        ).getBooking(jobId)
        if (!booking?.dispute) throw new Error("No open dispute on this booking")
        const nextDispute = {
          ...booking.dispute,
          vendorResponse: response.trim(),
        }
        await updateBookingFields(jobId, { dispute: nextDispute })
        const recipientUid = booking.createdByUid
        const event = EVENTS.find((e) => e.id === booking.eventId)
        if (recipientUid && recipientUid !== firebaseUser.uid) {
          await createNotification({
            recipientUid,
            weddingId: booking.weddingId,
            type: "dispute_vendor_response",
            message: formatDisputeVendorResponseMessage(
              business.name || booking.vendorName,
              booking.weddingName,
              event?.name ?? booking.eventId
            ),
            bookingId: jobId,
            href: `/vendors/bookings#booking-${jobId}`,
            actorUid: firebaseUser.uid,
            actorName: business.name,
          })
        }
        return
      }
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId ? { ...j, disputeVendorResponse: response } : j
        )
      )
    },
    [isFirebaseMode, firebaseUser, business.name]
  )

  const requestExtraWork = useCallback(
    async (jobId: string, data: { description: string; estimatedAmount?: number }) => {
      if (!isFirebaseMode || !firebaseUser) {
        throw new Error("Sign in as a vendor to request extra work")
      }
      const booking = await (
        await import("@/lib/firebase/bookings")
      ).getBooking(jobId)
      if (!booking) throw new Error("Booking not found")
      await setBookingExtraWorkRequest(jobId, {
        description: data.description.trim(),
        ...(data.estimatedAmount != null
          ? { estimatedAmount: data.estimatedAmount }
          : {}),
        status: "pending",
        requestedAt: Date.now(),
        requestedByUid: firebaseUser.uid,
      })
      const recipientUid = booking.createdByUid
      const event = EVENTS.find((e) => e.id === booking.eventId)
      if (recipientUid && recipientUid !== firebaseUser.uid) {
        await createNotification({
          recipientUid,
          weddingId: booking.weddingId,
          type: "extra_work_needed",
          message: formatExtraWorkNeededMessage(
            business.name || booking.vendorName,
            booking.weddingName,
            event?.name ?? booking.eventId
          ),
          bookingId: jobId,
          href: `/vendors/bookings#booking-${jobId}`,
          priority: "urgent",
          actorUid: firebaseUser.uid,
          actorName: business.name,
        })
      }
    },
    [isFirebaseMode, firebaseUser, business.name]
  )

  const updateIncidentResponse = useCallback((incidentId: string, response: string) => {
    setBusiness((prev) => ({
      ...prev,
      flaggedIncidents: prev.flaggedIncidents.map((inc) =>
        inc.id === incidentId ? { ...inc, vendorResponse: response } : inc
      ),
    }))
  }, [])

  const updateBusiness = useCallback((updates: Partial<VendorBusiness>) => {
    setBusiness((prev) => ({ ...prev, ...updates }))
  }, [])

  const earnings = useMemo(() => buildEarningsFromJobs(jobs), [jobs])

  const value = useMemo(
    () => ({
      business,
      requests,
      jobs,
      earnings,
      acceptRequest,
      declineRequest,
      proposeCounterOffer,
      vendorCheckIn,
      markJobCompleted,
      submitDisputeResponse,
      requestExtraWork,
      updateIncidentResponse,
      updateBusiness,
      refreshBusiness,
      submitVerification,
    }),
    [
      business,
      requests,
      jobs,
      earnings,
      acceptRequest,
      declineRequest,
      proposeCounterOffer,
      vendorCheckIn,
      markJobCompleted,
      submitDisputeResponse,
      requestExtraWork,
      updateIncidentResponse,
      updateBusiness,
      refreshBusiness,
      submitVerification,
    ]
  )

  return (
    <VendorPortalContext.Provider value={value}>
      {children}
    </VendorPortalContext.Provider>
  )
}

export function useVendorPortal() {
  const ctx = useContext(VendorPortalContext)
  if (!ctx) throw new Error("useVendorPortal must be used within VendorPortalProvider")
  return ctx
}
