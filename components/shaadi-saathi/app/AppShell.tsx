import type { ReactNode } from "react"
import { BottomNav, Sidebar } from "@/components/shaadi-saathi/app/AppNav"

/** Family app chrome — sidebar + mobile bottom nav with premium items */
export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="shaadi-saathi flex min-h-screen bg-ivory">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <main className="flex-1 overflow-x-hidden pb-32 lg:pb-0">
          <div className="mx-auto max-w-5xl px-5 py-7 sm:px-6 sm:py-9 lg:px-8">{children}</div>
        </main>
        <BottomNav />
      </div>
    </div>
  )
}
