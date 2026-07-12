import { redirect } from "next/navigation"

/** Earnings merged into My Jobs tab */
export default function VendorEarningsRedirect() {
  redirect("/vendor/jobs?tab=earnings")
}
