import { redirect } from "next/navigation"
import { TESTER_LINK_SECRET } from "@/lib/tester-mode"
import TesterClient from "./TesterClient"

/**
 * Staging-only demo login. Disabled on production so it cannot be used
 * as a backdoor on the live site.
 */
export default async function TesterPage({
  searchParams,
}: {
  searchParams: Promise<{ k?: string }>
}) {
  if (process.env.VERCEL_ENV === "production") {
    redirect("/")
  }

  const { k } = await searchParams
  if (k !== TESTER_LINK_SECRET) {
    redirect("/")
  }

  return <TesterClient />
}
