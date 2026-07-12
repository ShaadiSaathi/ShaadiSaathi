"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect } from "react"

export default function ProfileRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const gender = params.gender === "female" ? "female" : "male"

  useEffect(() => {
    router.replace(`/scanner/side-${gender}`)
  }, [gender, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
