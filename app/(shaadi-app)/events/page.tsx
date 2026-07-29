"use client"

import Link from "next/link"
import { useState } from "react"
import GoldButton from "@/components/shaadi-saathi/app/GoldButton"
import PageTransition from "@/components/shaadi-saathi/app/PageTransition"
import WeddingInviteLinkButton from "@/components/shaadi-saathi/guests/WeddingInviteLinkButton"
import UpgradePromptBanner from "@/components/shaadi-saathi/premium/UpgradePromptBanner"
import { usePremium } from "@/components/shaadi-saathi/premium/PremiumContext"
import { useGuests } from "@/components/shaadi-saathi/guests/GuestsContext"
import { EVENTS, formatEventDate } from "@/lib/mockData"
import { FREE_LIMITS } from "@/lib/premium"

export default function EventsPage() {
  const { isFamilyPremium, extraEvents, addExtraEvent } = usePremium()
  const { guests } = useGuests()
  const [showEventLimit, setShowEventLimit] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newEventName, setNewEventName] = useState("")
  const [newEventDate, setNewEventDate] = useState("")

  const totalEvents = EVENTS.length + extraEvents.length
  const atFreeLimit = !isFamilyPremium && totalEvents >= FREE_LIMITS.maxEvents

  function handleAddEvent() {
    if (!newEventName.trim() || !newEventDate) return
    const added = addExtraEvent(newEventName, newEventDate)
    if (!added) {
      setShowEventLimit(true)
      return
    }
    setNewEventName("")
    setNewEventDate("")
    setShowAddForm(false)
    setShowEventLimit(false)
  }

  function handleAddClick() {
    if (atFreeLimit) {
      setShowEventLimit(true)
      return
    }
    setShowAddForm(true)
  }

  return (
    <PageTransition>
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="shaadi-page-title">
            Events
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-maroon/60 sm:text-base">
            Mehndi, baraat, walima — each with its own guest list and details.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <WeddingInviteLinkButton />
          <GoldButton onClick={handleAddClick}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Event
          </GoldButton>
        </div>
      </header>

      {showEventLimit && (
        <div className="mb-6">
          <UpgradePromptBanner
            message="Upgrade to Premium to add unlimited events for your wedding celebrations."
            onDismiss={() => setShowEventLimit(false)}
          />
        </div>
      )}

      {showAddForm && (
        <div className="mb-6 shaadi-card p-5">
          <h2 className="shaadi-section-title">New event</h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={newEventName}
              onChange={(e) => setNewEventName(e.target.value)}
              placeholder="Event name (e.g. Dholki)"
              className="min-h-[44px] flex-1 rounded-xl border border-gold/20 bg-ivory px-4 py-2.5 text-sm"
            />
            <input
              type="date"
              value={newEventDate}
              onChange={(e) => setNewEventDate(e.target.value)}
              className="min-h-[44px] rounded-xl border border-gold/20 bg-ivory px-4 py-2.5 text-sm"
            />
            <GoldButton type="button" onClick={handleAddEvent}>
              Save
            </GoldButton>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
        {EVENTS.map((event) => {
          const guestCount = guests.filter((g) => g.events.includes(event.id)).length
          return (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="group shaadi-card relative block w-full min-h-[7.5rem] overflow-hidden transition-all active:scale-[0.99] hover:border-gold/25 hover:shadow-md md:min-h-0 md:active:scale-100"
            >
              <div className="h-1 bg-gradient-to-r from-gold/40 via-gold to-gold/40" aria-hidden="true" />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="shaadi-section-title text-xl group-hover:text-maroon">
                      {event.name}
                    </h2>
                    <p className="mt-1.5 text-sm text-maroon/60 md:mt-1">{formatEventDate(event.date)}</p>
                    <p className="text-sm text-maroon/50">{event.time}</p>
                  </div>
                  <span className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-gold/10 px-3 py-2 text-xs font-semibold text-maroon/70 md:min-h-0 md:px-2.5 md:py-1">
                    {guestCount} guests
                  </span>
                </div>
                <div className="mt-5 border-t border-gold/10 pt-4 md:mt-4">
                  <p className="text-sm font-medium text-maroon-dark">{event.venue}</p>
                  <p className="mt-0.5 text-xs text-maroon/50">{event.address}</p>
                </div>
              </div>
            </Link>
          )
        })}

        {extraEvents.map((event) => (
          <div
            key={event.id}
            className="shaadi-card relative w-full overflow-hidden border border-dashed border-gold/25 bg-ivory/50 p-5"
          >
            <span className="inline-flex rounded-full bg-gold/15 px-2.5 py-1 text-xs font-semibold uppercase text-gold-dark">
              Custom
            </span>
            <h2 className="shaadi-section-title mt-2 text-xl">{event.name}</h2>
            <p className="mt-1 text-sm text-maroon/60">{formatEventDate(event.date)}</p>
          </div>
        ))}
      </div>
    </PageTransition>
  )
}
