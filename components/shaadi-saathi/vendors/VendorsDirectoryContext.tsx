"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import {
  subscribeVendors,
  toDirectoryVendor,
} from "@/lib/firebase/vendors"
import { getAllVendors, type Vendor } from "@/lib/mockVendors"

interface VendorsDirectoryContextValue {
  vendors: Vendor[]
  loading: boolean
  getVendorById: (id: string) => Vendor | undefined
}

const VendorsDirectoryContext = createContext<VendorsDirectoryContextValue | null>(
  null
)

/**
 * Family-facing vendor directory.
 * Firebase mode: live Firestore only (no mock catalog).
 * Tester / local mock mode: mock catalog for demos.
 */
export function VendorsDirectoryProvider({ children }: { children: ReactNode }) {
  const { isFirebaseMode } = useAuth()
  const [vendors, setVendors] = useState<Vendor[]>(() =>
    isFirebaseMode ? [] : getAllVendors()
  )
  const [loading, setLoading] = useState(isFirebaseMode)

  useEffect(() => {
    if (!isFirebaseMode) {
      setVendors(getAllVendors())
      setLoading(false)
      return
    }

    setLoading(true)
    const unsub = subscribeVendors(
      (list) => {
        setVendors(list.map(toDirectoryVendor))
        setLoading(false)
      },
      () => {
        setVendors([])
        setLoading(false)
      }
    )
    return unsub
  }, [isFirebaseMode])

  const getVendorById = useCallback(
    (id: string) => vendors.find((v) => v.id === id),
    [vendors]
  )

  const value = useMemo(
    () => ({ vendors, loading, getVendorById }),
    [vendors, loading, getVendorById]
  )

  return (
    <VendorsDirectoryContext.Provider value={value}>
      {children}
    </VendorsDirectoryContext.Provider>
  )
}

export function useVendorsDirectory() {
  const ctx = useContext(VendorsDirectoryContext)
  if (!ctx) {
    throw new Error("useVendorsDirectory must be used within VendorsDirectoryProvider")
  }
  return ctx
}
