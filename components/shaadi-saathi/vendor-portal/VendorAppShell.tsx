import type { ReactNode } from "react"
import { VendorBottomNav, VendorSidebar } from "@/components/shaadi-saathi/vendor-portal/VendorAppNav"

/** Vendor app chrome — sidebar (≥768px) + mobile bottom tab bar */
export default function VendorAppShell({ children }: { children: ReactNode }) {
  return (
    <div className="shaadi-saathi flex min-h-screen bg-ivory">
      <VendorSidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <main className="min-w-0 flex-1 overflow-x-hidden pb-28 md:pb-0">
          <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-9 md:px-8 md:py-9">{children}</div>
        </main>
        <VendorBottomNav />
      </div>
    </div>
  )
}
