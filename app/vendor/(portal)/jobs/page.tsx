import { Suspense } from "react"
import VendorJobsPageClient from "./VendorJobsPageClient"

export default function VendorJobsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-maroon/60">Loading...</div>}>
      <VendorJobsPageClient />
    </Suspense>
  )
}
