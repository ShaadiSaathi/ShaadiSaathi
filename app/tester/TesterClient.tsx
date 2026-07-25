"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"

/** Enters the demo family session and sends you to the dashboard. */
export default function TesterClient() {
  const { enterTesterMode } = useAuth()
  const router = useRouter()

  useEffect(() => {
    enterTesterMode()
    router.replace("/dashboard")
  }, [enterTesterMode, router])

  return (
    <div className="flex min-h-dvh items-center justify-center bg-ivory px-6 text-center">
      <p className="font-serif text-lg text-maroon">Opening demo wedding…</p>
    </div>
  )
}
