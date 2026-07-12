"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import GoldButton from "@/components/shaadi-saathi/app/GoldButton"
import PageTransition from "@/components/shaadi-saathi/app/PageTransition"
import UpgradePromptBanner from "@/components/shaadi-saathi/premium/UpgradePromptBanner"
import { usePremium } from "@/components/shaadi-saathi/premium/PremiumContext"
import { useGuests } from "@/components/shaadi-saathi/guests/GuestsContext"

const TABLE_COUNT = 12

export default function SeatingPlannerPage() {
  const { isFamilyPremium, seating, assignGuestToTable } = usePremium()
  const { guests } = useGuests()
  const [selectedTable, setSelectedTable] = useState(1)

  const confirmedGuests = useMemo(
    () =>
      guests.filter((g) =>
        Object.values(g.rsvp).some((s) => s === "confirmed")
      ),
    [guests]
  )

  const guestsByTable = useMemo(() => {
    const map = new Map<number, typeof confirmedGuests>()
    for (let t = 1; t <= TABLE_COUNT; t++) map.set(t, [])
    for (const guest of confirmedGuests) {
      const assignment = seating.find((s) => s.guestId === guest.id)
      const table = assignment?.tableNumber ?? 0
      if (table > 0) map.get(table)?.push(guest)
    }
    return map
  }, [confirmedGuests, seating])

  const unassigned = confirmedGuests.filter(
    (g) => !seating.some((s) => s.guestId === g.id)
  )

  if (!isFamilyPremium) {
    return (
      <PageTransition>
        <header className="mb-6">
          <h1 className="font-display text-2xl font-bold text-maroon-dark">Seating planner</h1>
          <p className="mt-1 text-maroon/60">Assign confirmed guests to numbered tables.</p>
        </header>
        <UpgradePromptBanner message="Upgrade to Premium to use the seating planner and organise your walima tables with ease." />
        <Link href="/upgrade" className="mt-4 inline-block">
          <GoldButton>View Premium plans</GoldButton>
        </Link>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold text-maroon-dark">Seating planner</h1>
        <p className="mt-1 text-maroon/60">
          Select a table, then assign confirmed guests. {unassigned.length} guests still unassigned.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Table picker */}
        <section className="rounded-2xl border border-gold/20 bg-white p-5 shadow-sm lg:col-span-1">
          <h2 className="font-display text-lg font-semibold text-maroon-dark">Tables</h2>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3">
            {Array.from({ length: TABLE_COUNT }, (_, i) => i + 1).map((num) => {
              const count = guestsByTable.get(num)?.length ?? 0
              const active = selectedTable === num
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => setSelectedTable(num)}
                  className={`rounded-xl border px-3 py-4 text-center transition-colors ${
                    active
                      ? "border-maroon bg-maroon text-ivory"
                      : "border-gold/20 bg-ivory hover:border-gold/40"
                  }`}
                >
                  <span className="block font-display text-lg font-bold">{num}</span>
                  <span className={`text-xs ${active ? "text-gold" : "text-maroon/50"}`}>
                    {count} guests
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Assignment panel */}
        <section className="rounded-2xl border border-gold/20 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="font-display text-lg font-semibold text-maroon-dark">
            Table {selectedTable}
          </h2>

          <ul className="mt-4 space-y-2">
            {(guestsByTable.get(selectedTable) ?? []).map((guest) => (
              <li
                key={guest.id}
                className="flex items-center justify-between rounded-xl border border-gold/15 bg-ivory/50 px-4 py-2.5"
              >
                <span className="font-medium text-maroon-dark">{guest.name}</span>
                <button
                  type="button"
                  onClick={() => assignGuestToTable(guest.id, 0)}
                  className="text-xs text-maroon/40 hover:text-maroon"
                >
                  Remove
                </button>
              </li>
            ))}
            {(guestsByTable.get(selectedTable) ?? []).length === 0 && (
              <li className="py-6 text-center text-sm text-maroon/40">No guests at this table yet</li>
            )}
          </ul>

          {unassigned.length > 0 && (
            <div className="mt-6 border-t border-gold/15 pt-5">
              <h3 className="text-sm font-semibold text-maroon-dark">Assign a guest</h3>
              <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto">
                {unassigned.map((guest) => (
                  <li key={guest.id}>
                    <button
                      type="button"
                      onClick={() => assignGuestToTable(guest.id, selectedTable)}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm text-maroon/70 hover:bg-gold/10 hover:text-maroon-dark"
                    >
                      + {guest.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </PageTransition>
  )
}
