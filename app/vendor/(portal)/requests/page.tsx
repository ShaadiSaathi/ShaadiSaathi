"use client"

import { AnimatePresence } from "framer-motion"
import { useMemo, useState } from "react"
import PageTransition from "@/components/shaadi-saathi/app/PageTransition"
import BookingRequestCard from "@/components/shaadi-saathi/vendor-portal/BookingRequestCard"
import { usePremium } from "@/components/shaadi-saathi/premium/PremiumContext"
import { useVendorPortal } from "@/components/shaadi-saathi/vendor-portal/VendorPortalContext"

export default function VendorRequestsPage() {
  const { requests, acceptRequest, declineRequest, proposeCounterOffer } = useVendorPortal()
  const { vendorTier } = usePremium()
  const isFeatured = vendorTier === "featured"
  const [acceptedRequest, setAcceptedRequest] = useState<typeof requests[0] | null>(null)
  const [decliningId, setDecliningId] = useState<string | null>(null)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [messageToast, setMessageToast] = useState<string | null>(null)

  const competingByDate = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of requests) {
      if (!r.eventDate) continue
      counts.set(r.eventDate, (counts.get(r.eventDate) ?? 0) + 1)
    }
    return counts
  }, [requests])

  async function handleAccept(id: string) {
    const req = requests.find((r) => r.id === id)
    if (!req) return
    setAcceptingId(id)
    setMessageToast(null)
    try {
      await acceptRequest(id)
      setAcceptedRequest(req)
    } catch (err) {
      setMessageToast(
        err instanceof Error
          ? err.message
          : "Could not accept this booking — the date may already be taken."
      )
    } finally {
      setAcceptingId(null)
    }
  }

  function handleDecline(id: string) {
    setDecliningId(id)
    setTimeout(() => {
      void declineRequest(id)
      setDecliningId(null)
    }, 300)
  }

  function handleMessage(familyName: string) {
    setMessageToast(`Message thread opened with ${familyName} (mock)`)
    setTimeout(() => setMessageToast(null), 3000)
  }

  return (
    <PageTransition>
      <header className="mb-8">
        <h1 className="shaadi-page-title">
          Booking requests
        </h1>
        <p className="mt-1 text-maroon/60">
          Review incoming requests from families — accept, decline, or ask questions first
        </p>
        {isFeatured && (
          <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-medium text-gold-dark">
            <span aria-hidden="true">⚡</span>
            Early Access — Featured vendors see new requests first
          </p>
        )}
      </header>

      {messageToast && (
        <div
          className="mb-4 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm font-medium text-maroon-dark"
          role="status"
        >
          {messageToast}
        </div>
      )}

      {requests.length === 0 && !acceptedRequest ? (
        <div className="shaadi-card border border-dashed border-gold/25 bg-ivory/40 p-12 text-center">
          <p className="shaadi-section-title text-xl">All caught up!</p>
          <p className="mt-3 text-sm leading-relaxed text-maroon/60">
              No pending booking requests right now. New requests from families will appear here.
            </p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {acceptedRequest && (
              <BookingRequestCard
                key={`accepted-${acceptedRequest.id}`}
                request={acceptedRequest}
                onAccept={() => {}}
                onDecline={() => {}}
                accepted
              />
            )}
            {requests.map((req) => {
              const sameDate = competingByDate.get(req.eventDate) ?? 0
              const competingCount = Math.max(0, sameDate - 1)
              return (
                <BookingRequestCard
                  key={req.id}
                  request={req}
                  onAccept={() => void handleAccept(req.id)}
                  onDecline={() => handleDecline(req.id)}
                  onProposeChanges={(data) => proposeCounterOffer(req.id, data)}
                  onMessage={() => handleMessage(req.familyName)}
                  declining={decliningId === req.id || acceptingId === req.id}
                  competingCount={competingCount}
                />
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </PageTransition>
  )
}
