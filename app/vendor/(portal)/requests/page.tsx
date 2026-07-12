"use client"

import { AnimatePresence } from "framer-motion"
import { useState } from "react"
import PageTransition from "@/components/shaadi-saathi/app/PageTransition"
import BookingRequestCard from "@/components/shaadi-saathi/vendor-portal/BookingRequestCard"
import { usePremium } from "@/components/shaadi-saathi/premium/PremiumContext"
import { useVendorPortal } from "@/components/shaadi-saathi/vendor-portal/VendorPortalContext"
import MehndiPattern from "@/components/shaadi-saathi/MehndiPattern"

export default function VendorRequestsPage() {
  const { requests, acceptRequest, declineRequest, proposeCounterOffer } = useVendorPortal()
  const { vendorTier } = usePremium()
  const isFeatured = vendorTier === "featured"
  const [acceptedRequest, setAcceptedRequest] = useState<typeof requests[0] | null>(null)
  const [decliningId, setDecliningId] = useState<string | null>(null)
  const [messageToast, setMessageToast] = useState<string | null>(null)

  function handleAccept(id: string) {
    const req = requests.find((r) => r.id === id)
    if (req) setAcceptedRequest(req)
    acceptRequest(id)
  }

  function handleDecline(id: string) {
    setDecliningId(id)
    setTimeout(() => {
      declineRequest(id)
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
        <h1 className="font-display text-2xl font-bold text-maroon-dark sm:text-3xl">
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
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-gold/30 bg-white/60 p-12 text-center">
          <MehndiPattern opacity={0.05} />
          <div className="relative">
            <p className="font-display text-xl font-semibold text-maroon-dark">All caught up!</p>
            <p className="mt-2 text-maroon/60">
              No pending booking requests right now. New requests from families will appear here.
            </p>
          </div>
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
            {requests.map((req) => (
              <BookingRequestCard
                key={req.id}
                request={req}
                onAccept={() => handleAccept(req.id)}
                onDecline={() => handleDecline(req.id)}
                onProposeChanges={(data) => proposeCounterOffer(req.id, data)}
                onMessage={() => handleMessage(req.familyName)}
                declining={decliningId === req.id}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </PageTransition>
  )
}
