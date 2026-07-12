"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { isFirebaseConfigured } from "@/lib/firebase/config"
import { subscribeWedding } from "@/lib/firebase/weddings"
import type { FirestoreWedding } from "@/lib/firebase/types"
import { WEDDING } from "@/lib/mockData"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"

interface WeddingContextValue {
  weddingId: string | null
  wedding: FirestoreWedding | null
  isFirebaseMode: boolean
  loading: boolean
}

export const WeddingContext = createContext<WeddingContextValue | null>(null)

export function WeddingProvider({ children }: { children: ReactNode }) {
  const { weddingId: authWeddingId } = useAuth()
  const isFirebaseMode = isFirebaseConfigured()
  const [wedding, setWedding] = useState<FirestoreWedding | null>(null)
  const [loading, setLoading] = useState(isFirebaseMode)

  const weddingId = authWeddingId ?? (isFirebaseMode ? null : WEDDING.id)

  useEffect(() => {
    if (!isFirebaseMode || !authWeddingId) {
      setWedding(null)
      setLoading(false)
      return
    }

    setLoading(true)
    const unsub = subscribeWedding(
      authWeddingId,
      (doc) => {
        setWedding(doc)
        setLoading(false)
      },
      () => setLoading(false)
    )
    return unsub
  }, [isFirebaseMode, authWeddingId])

  const value = useMemo(
    () => ({
      weddingId,
      wedding,
      isFirebaseMode,
      loading,
    }),
    [weddingId, wedding, isFirebaseMode, loading]
  )

  return <WeddingContext.Provider value={value}>{children}</WeddingContext.Provider>
}

export function useWedding() {
  const ctx = useContext(WeddingContext)
  if (!ctx) throw new Error("useWedding must be used within WeddingProvider")
  return ctx
}
