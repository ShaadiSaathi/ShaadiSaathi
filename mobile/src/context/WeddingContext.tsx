import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore"
import { useAuth } from "@/src/context/AuthContext"
import { getFirestoreDb } from "@/src/lib/firebase"
import type { FirestoreWedding } from "@/src/lib/types"

type WeddingContextValue = {
  wedding: FirestoreWedding | null
  weddingId: string | null
  loading: boolean
  createWedding: (input: {
    name: string
    organiserName: string
    organiserPhone: string
    firstEventDate: string
  }) => Promise<string>
}

const WeddingContext = createContext<WeddingContextValue | null>(null)

function makeShareCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)]!
  }
  return `SS-${code}`
}

export function WeddingProvider({ children }: { children: ReactNode }) {
  const { user, profile, linkWedding } = useAuth()
  const weddingId = profile?.role === "family" ? profile.weddingId ?? null : null
  const [wedding, setWedding] = useState<FirestoreWedding | null>(null)
  const [loading, setLoading] = useState(Boolean(weddingId))

  useEffect(() => {
    if (!weddingId) {
      setWedding(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const unsub: Unsubscribe = onSnapshot(
      doc(getFirestoreDb(), "weddings", weddingId),
      (snap) => {
        setWedding(
          snap.exists()
            ? ({ id: snap.id, ...snap.data() } as FirestoreWedding)
            : null
        )
        setLoading(false)
      },
      () => {
        setWedding(null)
        setLoading(false)
      }
    )
    return unsub
  }, [weddingId])

  const createWedding = async (input: {
    name: string
    organiserName: string
    organiserPhone: string
    firstEventDate: string
  }) => {
    if (!user) throw new Error("Not signed in")
    if (profile?.weddingId) return profile.weddingId

    const id = doc(collection(getFirestoreDb(), "weddings")).id
    const weddingDoc: FirestoreWedding = {
      id,
      name: input.name.trim(),
      couple: input.name.trim(),
      shareCode: makeShareCode(),
      isPremium: false,
      ownerId: user.uid,
      memberUids: [user.uid],
      organiserName: input.organiserName.trim(),
      organiserPhone: input.organiserPhone,
      firstEventDate: input.firstEventDate,
      createdAt: Date.now(),
    }
    await setDoc(doc(getFirestoreDb(), "weddings", id), weddingDoc)
    await linkWedding(id)
    return id
  }

  const value = useMemo(
    () => ({ wedding, weddingId, loading, createWedding }),
    // createWedding closes over latest user/profile via linkWedding
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wedding, weddingId, loading, linkWedding, user, profile?.weddingId]
  )

  return (
    <WeddingContext.Provider value={value}>{children}</WeddingContext.Provider>
  )
}

export function useWedding(): WeddingContextValue {
  const ctx = useContext(WeddingContext)
  if (!ctx) throw new Error("useWedding must be used within WeddingProvider")
  return ctx
}
