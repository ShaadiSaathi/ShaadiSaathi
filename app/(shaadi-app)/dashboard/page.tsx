"use client"

import Link from "next/link"
import PageTransition from "@/components/shaadi-saathi/app/PageTransition"
import StatCard from "@/components/shaadi-saathi/app/StatCard"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import WeddingInviteLinkButton from "@/components/shaadi-saathi/guests/WeddingInviteLinkButton"
import PremiumBadge from "@/components/shaadi-saathi/premium/PremiumBadge"
import { usePremium } from "@/components/shaadi-saathi/premium/PremiumContext"
import { useGuests } from "@/components/shaadi-saathi/guests/GuestsContext"
import { useTasks } from "@/components/shaadi-saathi/tasks/TasksContext"
import { useVendorBookings } from "@/components/shaadi-saathi/vendors/VendorBookingsContext"
import { useWedding } from "@/components/shaadi-saathi/firebase/WeddingContext"
import { getBookingProgress } from "@/lib/mockVendors"
import {
  EVENTS,
  formatEventDate,
  getDaysUntil,
  getNextUpcomingEvent,
  getTotalRsvpStats,
} from "@/lib/mockData"

const EVENT_DOT: Record<string, string> = {
  mehndi: "bg-rose-400",
  baraat: "bg-amber-400",
  walima: "bg-emerald-400",
}

export default function DashboardPage() {
  const { bookings } = useVendorBookings()
  const { guests } = useGuests()
  const { tasks } = useTasks()
  const { familyUser } = useAuth()
  const { wedding } = useWedding()
  const { isFamilyPremium } = usePremium()
  const nextEvent = getNextUpcomingEvent()
  const rsvpStats = getTotalRsvpStats(guests)
  const taskStats = {
    done: tasks.filter((t) => t.status === "done").length,
    outstanding: tasks.filter((t) => t.status !== "done").length,
    total: tasks.length,
  }
  const vendorProgress = getBookingProgress(bookings)
  const daysUntil = nextEvent ? getDaysUntil(nextEvent.date) : 0
  const weddingName = familyUser?.weddingName || wedding?.name || "Your wedding"

  return (
    <PageTransition>
      {/* Welcome header */}
      <header className="mb-8">
        <p className="text-sm font-medium text-maroon/60">Good morning</p>
        <h1 className="font-display text-2xl font-bold text-maroon-dark sm:text-3xl">
          Welcome back, {familyUser?.name || "there"}
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-maroon/70">
          {weddingName}
          {isFamilyPremium && <PremiumBadge />}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {nextEvent && (
            <p className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-sm font-medium text-maroon-dark">
              <span className="h-2 w-2 rounded-full bg-gold" aria-hidden="true" />
              {daysUntil} days until the {nextEvent.name}
            </p>
          )}
          <WeddingInviteLinkButton variant="link" />
        </div>
      </header>

      {/* Overview cards */}
      <section aria-labelledby="overview-heading" className="mb-8">
        <h2 id="overview-heading" className="sr-only">
          Overview
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <StatCard
            label="Total guests"
            value={guests.length}
            subtext="Across all events"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            }
          />
          <StatCard
            label="RSVPs"
            value={rsvpStats.confirmed}
            subtext={`${rsvpStats.pending} still pending`}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            label="Tasks done"
            value={`${taskStats.done}/${taskStats.total}`}
            subtext={`${taskStats.outstanding} outstanding`}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
              </svg>
            }
          />
          <Link href="/vendors/bookings" className="block transition-opacity hover:opacity-90">
            <StatCard
              label="Vendors booked"
              value={`${vendorProgress.booked}/${vendorProgress.total}`}
              subtext="Essential categories covered"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                </svg>
              }
            />
          </Link>
          <StatCard
            label="Next up"
            value={nextEvent?.name ?? "—"}
            subtext={nextEvent ? formatEventDate(nextEvent.date) : "All done!"}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            }
          />
        </div>
      </section>

      {/* Timeline strip */}
      <section aria-labelledby="timeline-heading">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="timeline-heading" className="font-display text-lg font-semibold text-maroon-dark">
            Your events
          </h2>
          <Link href="/events" className="text-sm font-medium text-gold-dark hover:underline">
            View all
          </Link>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2">
          {EVENTS.map((event, i) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="group min-w-[200px] flex-1 rounded-2xl border border-gold/20 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${EVENT_DOT[event.id] ?? "bg-gold"}`} />
                <span className="font-display font-semibold text-maroon-dark group-hover:text-maroon">
                  {event.name}
                </span>
              </div>
              <p className="mt-2 text-sm text-maroon/60">{formatEventDate(event.date)}</p>
              <p className="text-xs text-maroon/40">{event.time}</p>
              {i < EVENTS.length - 1 && (
                <span className="sr-only">Next: {EVENTS[i + 1]?.name}</span>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* Quick links */}
      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/guests"
          className="rounded-xl border border-gold/15 bg-white/80 px-4 py-3 text-sm font-medium text-maroon transition-colors hover:border-gold/30 hover:bg-white"
        >
          Review RSVPs →
        </Link>
        <Link
          href="/vendors"
          className="rounded-xl border border-gold/15 bg-white/80 px-4 py-3 text-sm font-medium text-maroon transition-colors hover:border-gold/30 hover:bg-white"
        >
          Browse vendors →
        </Link>
        <Link
          href="/tasks"
          className="rounded-xl border border-gold/15 bg-white/80 px-4 py-3 text-sm font-medium text-maroon transition-colors hover:border-gold/30 hover:bg-white"
        >
          Check tasks →
        </Link>
        <Link
          href="/schedule"
          className="rounded-xl border border-gold/15 bg-white/80 px-4 py-3 text-sm font-medium text-maroon transition-colors hover:border-gold/30 hover:bg-white"
        >
          View schedule →
        </Link>
      </section>
    </PageTransition>
  )
}
