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
import { MOCK_NOW, type CheckInPhoto } from "@/lib/mockPayments"
import {
  CURRENT_VENDOR,
  INITIAL_BOOKING_REQUESTS,
  INITIAL_VENDOR_JOBS,
  buildEarningsFromJobs,
  requestToJob,
  type BookingRequest,
  type VendorBusiness,
  type VendorJob,
} from "@/lib/mockVendorPortal"

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
  ) => void
  vendorCheckIn: (jobId: string, photo: CheckInPhoto) => void
  markJobCompleted: (jobId: string) => void
  submitDisputeResponse: (jobId: string, response: string) => void
  updateIncidentResponse: (incidentId: string, response: string) => void
  updateBusiness: (updates: Partial<VendorBusiness>) => void
}

const VendorPortalContext = createContext<VendorPortalContextValue | null>(null)

/** Mock vendor portal state — swap for Convex when backend is ready */
export function VendorPortalProvider({ children }: { children: ReactNode }) {
  const { vendorUser } = useAuth()
  const { vendorTier } = usePremium()
  const [business, setBusiness] = useState<VendorBusiness>(CURRENT_VENDOR)
  const [requests, setRequests] = useState<BookingRequest[]>(INITIAL_BOOKING_REQUESTS)
  const [jobs, setJobs] = useState<VendorJob[]>(INITIAL_VENDOR_JOBS)

  useEffect(() => {
    if (!vendorUser) return
    const category = getCategoryById(vendorUser.categoryId)
    setBusiness((prev) => ({
      ...prev,
      name: vendorUser.businessName,
      categoryId: vendorUser.categoryId,
      categoryLabel: category?.label ?? prev.categoryLabel,
      city: vendorUser.city,
      phone: `+92 ${vendorUser.phone.slice(0, 3)} ${vendorUser.phone.slice(3, 6)} ${vendorUser.phone.slice(6)}`,
      bio: vendorUser.bio || prev.bio,
    }))
  }, [vendorUser])

  useEffect(() => {
    setBusiness((prev) => ({
      ...prev,
      subscriptionTier: vendorTier,
    }))
  }, [vendorTier])

  const acceptRequest = useCallback((id: string) => {
    setRequests((prev) => {
      const req = prev.find((r) => r.id === id)
      if (!req) return prev
      const job = requestToJob({ ...req, status: "accepted" })
      setJobs((j) => [job, ...j])
      return prev.filter((r) => r.id !== id)
    })
  }, [])

  const declineRequest = useCallback((id: string) => {
    setRequests((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const proposeCounterOffer = useCallback(
    (id: string, data: { price: number; packageName?: string; note?: string }) => {
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
    []
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

  const submitDisputeResponse = useCallback((jobId: string, response: string) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId ? { ...j, disputeVendorResponse: response } : j
      )
    )
  }, [])

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
      updateIncidentResponse,
      updateBusiness,
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
      updateIncidentResponse,
      updateBusiness,
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
