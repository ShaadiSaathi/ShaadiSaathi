"use client"

import { useState } from "react"
import type { EventId } from "@/lib/mockData"
import { EVENTS } from "@/lib/mockData"
import type { InPersonMethod, PaymentPath } from "@/lib/mockPayments"
import { calculateDepositSplit, formatPaymentPathLabel } from "@/lib/mockPayments"
import {
  formatPrice,
  type Vendor,
  type VendorPackage,
} from "@/lib/mockVendors"
import { useGuests } from "@/components/shaadi-saathi/guests/GuestsContext"
import GoldButton from "@/components/shaadi-saathi/app/GoldButton"
import DepositBalanceCard from "./payments/DepositBalanceCard"
import PaymentPathSelector, {
  MockDepositPayment,
} from "./payments/PaymentPathSelector"
import { useVendorBookings } from "./VendorBookingsContext"

type Step = "details" | "payment" | "deposit" | "confirmed"

interface BookingModalProps {
  vendor: Vendor
  onClose: () => void
}

/** Booking flow with payment path + deposit — PLACEHOLDER for real payment gateway */
export default function BookingModal({ vendor, onClose }: BookingModalProps) {
  const { addBooking } = useVendorBookings()
  const { guests } = useGuests()
  const confirmedCountFor = (ev: EventId) =>
    guests.filter((g) => g.rsvp[ev] === "confirmed").length
  const [step, setStep] = useState<Step>("details")
  const [eventId, setEventId] = useState<EventId>("walima")
  const [selectedPackage, setSelectedPackage] = useState<VendorPackage | null>(
    vendor.packages?.[0] ?? null
  )
  const [guestCount, setGuestCount] = useState(0)
  const [note, setNote] = useState("")
  const [paymentPath, setPaymentPath] = useState<PaymentPath>("in_person")
  const [inPersonMethod, setInPersonMethod] = useState<InPersonMethod>("cash")

  const availableEvents = EVENTS.filter((e) => vendor.availableFor.includes(e.id))

  function handleEventChange(id: EventId) {
    setEventId(id)
    setGuestCount(confirmedCountFor(id))
  }

  function computePrice(): number {
    if (selectedPackage?.perHead) {
      return selectedPackage.price * guestCount
    }
    return selectedPackage?.price ?? vendor.startingPrice
  }

  const totalPrice = computePrice()
  const split = calculateDepositSplit(totalPrice)
  const eventName = EVENTS.find((e) => e.id === eventId)?.name ?? ""

  function handleDetailsSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStep("payment")
  }

  function handlePaymentContinue() {
    setStep("deposit")
  }

  function handleDepositPaid() {
    addBooking({
      vendorId: vendor.id,
      eventId,
      guestCount: selectedPackage?.perHead ? guestCount : undefined,
      packageName: selectedPackage?.name,
      price: totalPrice,
      note: note || undefined,
      paymentPath,
      inPersonMethod: paymentPath === "in_person" ? inPersonMethod : undefined,
    })
    setStep("confirmed")
  }

  const previewPayment = {
    ...split,
    paymentPath,
    inPersonMethod: paymentPath === "in_person" ? inPersonMethod : undefined,
    depositStatus: "held" as const,
    balanceStatus:
      paymentPath === "in_person" ? ("due_in_person" as const) : ("pending_online" as const),
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-maroon-dark/40 p-4 sm:items-center"
      role="dialog"
      aria-labelledby="booking-modal-title"
      aria-modal="true"
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-gold/25 bg-ivory p-6 shadow-xl">
        {step === "confirmed" ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 id="booking-modal-title" className="font-display text-xl font-semibold text-maroon-dark">
              You&apos;re all set!
            </h2>
            <p className="mt-3 leading-relaxed text-maroon/70">
              Booking confirmed with <strong>{vendor.name}</strong> for your{" "}
              <strong>{eventName}</strong>.
            </p>
            <p className="mt-2 text-sm text-maroon/60">
              Deposit of {formatPrice(split.depositAmount)} is held safely until vendor check-in.
              Balance ({formatPrice(split.balanceAmount)}):{" "}
              {formatPaymentPathLabel(previewPayment).toLowerCase()}.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <GoldButton onClick={onClose} className="w-full">
                Done
              </GoldButton>
              <GoldButton
                variant="ghost"
                onClick={() => (window.location.href = "/vendors/bookings")}
                className="w-full"
              >
                View my bookings
              </GoldButton>
            </div>
          </div>
        ) : step === "deposit" ? (
          <>
            <h2 id="booking-modal-title" className="font-display text-xl font-semibold text-maroon-dark">
              Pay your deposit
            </h2>
            <p className="mt-1 text-sm text-maroon/60">
              Required for all bookings — held until {vendor.name} checks in on the day.
            </p>
            <div className="mt-4">
              <DepositBalanceCard payment={previewPayment} />
            </div>
            <div className="mt-4">
              <MockDepositPayment
                depositAmount={split.depositAmount}
                onPaid={handleDepositPaid}
              />
            </div>
            <GoldButton
              type="button"
              variant="ghost"
              onClick={() => setStep("payment")}
              className="mt-3 w-full"
            >
              Back
            </GoldButton>
          </>
        ) : step === "payment" ? (
          <>
            <h2 id="booking-modal-title" className="font-display text-xl font-semibold text-maroon-dark">
              Payment plan
            </h2>
            <p className="mt-1 text-sm text-maroon/60">{vendor.name}</p>
            <div className="mt-4">
              <DepositBalanceCard payment={previewPayment} />
            </div>
            <div className="mt-5">
              <PaymentPathSelector
                paymentPath={paymentPath}
                inPersonMethod={inPersonMethod}
                onPathChange={setPaymentPath}
                onMethodChange={setInPersonMethod}
                acceptsCardInPerson={vendor.acceptsCardInPerson ?? false}
              />
            </div>
            <div className="mt-6 flex gap-3">
              <GoldButton onClick={handlePaymentContinue} className="flex-1">
                Continue to deposit
              </GoldButton>
              <GoldButton
                type="button"
                variant="ghost"
                onClick={() => setStep("details")}
                className="flex-1"
              >
                Back
              </GoldButton>
            </div>
          </>
        ) : (
          <>
            <h2 id="booking-modal-title" className="font-display text-xl font-semibold text-maroon-dark">
              Request booking
            </h2>
            <p className="mt-1 text-sm text-maroon/60">{vendor.name}</p>

            <form onSubmit={handleDetailsSubmit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="booking-event" className="block text-sm font-medium text-maroon/70">
                  Which event?
                </label>
                <select
                  id="booking-event"
                  value={eventId}
                  onChange={(e) => handleEventChange(e.target.value as EventId)}
                  className="mt-1 w-full rounded-xl border border-gold/20 bg-white px-4 py-2.5 text-sm focus:border-maroon/30 focus:outline-none"
                >
                  {availableEvents.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name} — {ev.date}
                    </option>
                  ))}
                </select>
              </div>

              {vendor.packages && vendor.packages.length > 0 && (
                <div>
                  <label htmlFor="booking-package" className="block text-sm font-medium text-maroon/70">
                    Package
                  </label>
                  <select
                    id="booking-package"
                    value={selectedPackage?.name ?? ""}
                    onChange={(e) => {
                      const pkg = vendor.packages?.find((p) => p.name === e.target.value)
                      setSelectedPackage(pkg ?? null)
                    }}
                    className="mt-1 w-full rounded-xl border border-gold/20 bg-white px-4 py-2.5 text-sm focus:border-maroon/30 focus:outline-none"
                  >
                    {vendor.packages.map((pkg) => (
                      <option key={pkg.name} value={pkg.name}>
                        {pkg.name} — {formatPrice(pkg.price, pkg.perHead)}
                      </option>
                    ))}
                  </select>
                  {selectedPackage && (
                    <p className="mt-1 text-xs text-maroon/50">{selectedPackage.description}</p>
                  )}
                </div>
              )}

              {selectedPackage?.perHead && (
                <div>
                  <label htmlFor="booking-guests" className="block text-sm font-medium text-maroon/70">
                    Guest count
                    <span className="ml-1 font-normal text-maroon/40">
                      (default from confirmed RSVPs)
                    </span>
                  </label>
                  <input
                    id="booking-guests"
                    type="number"
                    min={1}
                    value={guestCount}
                    onChange={(e) => setGuestCount(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-gold/20 bg-white px-4 py-2.5 text-sm focus:border-maroon/30 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label htmlFor="booking-note" className="block text-sm font-medium text-maroon/70">
                  Note for vendor (optional)
                </label>
                <textarea
                  id="booking-note"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Any dietary requirements, timing preferences..."
                  className="mt-1 w-full resize-none rounded-xl border border-gold/20 bg-white px-4 py-2.5 text-sm focus:border-maroon/30 focus:outline-none"
                />
              </div>

              <p className="rounded-xl bg-gold/10 px-4 py-3 text-sm text-maroon-dark">
                Estimated total: <strong>{formatPrice(totalPrice)}</strong>
              </p>

              <div className="flex gap-3 pt-2">
                <GoldButton type="submit" className="flex-1">
                  Continue
                </GoldButton>
                <GoldButton type="button" variant="ghost" onClick={onClose} className="flex-1">
                  Cancel
                </GoldButton>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
