import type { ReactNode } from "react"

function Bone({ className = "" }: { className?: string }) {
  return <span className={`shaadi-skeleton rounded-md ${className}`} aria-hidden="true" />
}

function Screen({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <Screen label="Loading dashboard">
      <div className="shaadi-page-header space-y-3">
        <Bone className="h-3 w-24" />
        <Bone className="h-8 w-64 max-w-full" />
        <Bone className="h-4 w-40" />
      </div>
      <div className="shaadi-section grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="shaadi-card px-5 py-6 sm:px-6 sm:py-7">
            <Bone className="h-3 w-20" />
            <Bone className="mt-4 h-10 w-16" />
            <Bone className="mt-3 h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="shaadi-card w-[78vw] max-w-[280px] shrink-0 p-5 md:w-auto md:flex-1">
            <Bone className="h-4 w-24" />
            <Bone className="mt-3 h-3 w-32" />
            <Bone className="mt-2 h-3 w-16" />
          </div>
        ))}
      </div>
    </Screen>
  )
}

export function GuestListSkeleton() {
  return (
    <Screen label="Loading guests">
      <div className="shaadi-stack">
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className="shaadi-card flex flex-col gap-5 p-6 md:grid md:grid-cols-[minmax(12rem,1.4fr)_minmax(8rem,1fr)_auto] md:items-center md:gap-4 md:p-5"
          >
            <div className="flex items-center gap-3">
              <Bone className="h-10 w-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Bone className="h-4 w-36 max-w-full" />
                <Bone className="h-3 w-24" />
              </div>
            </div>
            <div className="flex gap-2">
              <Bone className="h-6 w-16 rounded-full" />
              <Bone className="h-6 w-16 rounded-full" />
            </div>
            <div className="flex justify-end gap-2">
              <Bone className="h-9 w-24 rounded-full" />
              <Bone className="h-9 w-28 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </Screen>
  )
}

export function VendorGridSkeleton() {
  return (
    <Screen label="Loading vendors">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-gold/20 bg-white">
            <Bone className="block h-36 w-full rounded-none" />
            <div className="space-y-2 p-5">
              <Bone className="h-5 w-3/4" />
              <Bone className="h-3 w-20" />
              <Bone className="h-6 w-24 rounded-full" />
              <Bone className="mt-2 h-4 w-28" />
            </div>
          </div>
        ))}
      </div>
    </Screen>
  )
}

export function TaskListSkeleton() {
  return (
    <Screen label="Loading tasks">
      <div className="shaadi-stack">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="shaadi-card flex items-center gap-3 px-4 py-4">
            <Bone className="h-6 w-6 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Bone className="h-4 w-2/3 max-w-xs" />
              <Bone className="h-3 w-40" />
            </div>
            <Bone className="h-4 w-16 shrink-0" />
          </div>
        ))}
      </div>
    </Screen>
  )
}

export function BookingListSkeleton() {
  return (
    <Screen label="Loading bookings">
      <div className="shaadi-stack">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="rounded-2xl border border-gold/15 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Bone className="h-11 w-11 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Bone className="h-4 w-40 max-w-full" />
                  <Bone className="h-3 w-28" />
                </div>
              </div>
              <Bone className="h-4 w-16 shrink-0" />
            </div>
            <div className="mt-4 flex gap-2">
              <Bone className="h-6 w-20 rounded-full" />
              <Bone className="h-6 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </Screen>
  )
}

export function BookingDetailSkeleton() {
  return (
    <Screen label="Loading booking details">
      <Bone className="mb-6 h-4 w-32" />
      <Bone className="mb-8 block h-56 w-full rounded-[1.25rem] sm:h-72" />
      <Bone className="h-8 w-56 max-w-full" />
      <Bone className="mt-3 h-4 w-40" />
      <div className="mt-8 space-y-3">
        <Bone className="h-4 w-full" />
        <Bone className="h-4 w-5/6" />
        <Bone className="h-4 w-2/3" />
      </div>
    </Screen>
  )
}

export function ChatResponseSkeleton() {
  return (
    <Screen label="Assistant is writing">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Bone className="h-7 w-7 rounded-full" />
          <Bone className="h-3 w-16" />
        </div>
        <div className="space-y-2.5 rounded-3xl bg-white/70 p-5 ring-1 ring-maroon/5">
          <Bone className="h-3.5 w-full" />
          <Bone className="h-3.5 w-11/12" />
          <Bone className="h-3.5 w-4/5" />
          <Bone className="h-3.5 w-2/3" />
        </div>
      </div>
    </Screen>
  )
}

export function ReviewListSkeleton() {
  return (
    <Screen label="Loading reviews">
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="rounded-2xl border border-gold/30 bg-white p-5">
            <Bone className="h-4 w-28" />
            <Bone className="mt-4 h-4 w-full" />
            <Bone className="mt-2 h-4 w-3/4" />
            <Bone className="mt-4 h-3 w-24" />
          </div>
        ))}
      </div>
    </Screen>
  )
}

export function ScheduleSkeleton() {
  return (
    <Screen label="Loading schedule">
      <div className="space-y-8">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="pl-9 md:pl-14">
            <Bone className="mb-4 h-3 w-28" />
            <div className="shaadi-card p-5">
              <Bone className="h-5 w-20 rounded-full" />
              <Bone className="mt-3 h-5 w-48 max-w-full" />
              <Bone className="mt-2 h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    </Screen>
  )
}

export function ChatHistorySkeleton() {
  return (
    <Screen label="Loading chat history">
      <div className="space-y-2">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="rounded-2xl bg-white/50 px-3.5 py-2.5 ring-1 ring-maroon/8">
            <Bone className="h-4 w-full" />
            <Bone className="mt-2 h-3 w-24" />
          </div>
        ))}
      </div>
    </Screen>
  )
}
