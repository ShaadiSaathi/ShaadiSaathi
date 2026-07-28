import type { ReactNode } from "react"
import { BottomNav, Sidebar } from "@/components/shaadi-saathi/app/AppNav"
import NotificationBell from "@/components/shaadi-saathi/notifications/NotificationBell"

/** Family app chrome — sidebar (≥768px) + mobile bottom tab bar */
export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="shaadi-saathi flex min-h-screen bg-ivory">
      <Sidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        {/* Mobile-only top bar for the notification bell (desktop uses sidebar). */}
        <div className="sticky top-0 z-40 flex items-center justify-end border-b border-gold/10 bg-ivory/95 px-3 py-2 backdrop-blur-sm md:hidden">
          <NotificationBell />
        </div>
        <main className="min-w-0 flex-1 overflow-x-hidden pb-28 md:pb-0">
          <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-9 md:px-8 md:py-9">{children}</div>
        </main>
        <BottomNav />
      </div>
    </div>
  )
}
