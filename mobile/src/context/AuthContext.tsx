import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  onAuthStateChanged,
  signInWithCustomToken,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { sendMobileOtp, toE164, verifyMobileOtp } from "@/src/lib/api"
import {
  getFirebaseAuth,
  getFirestoreDb,
  isFirebaseConfigured,
} from "@/src/lib/firebase"
import type { FirestoreUser, UserRole } from "@/src/lib/types"

type AuthStatus = "loading" | "signedOut" | "signedIn"

type AuthContextValue = {
  status: AuthStatus
  user: User | null
  profile: FirestoreUser | null
  configured: boolean
  sendOtp: (phone: string, flow?: "login" | "signup") => Promise<void>
  confirmOtp: (phone: string, code: string, flow?: "login" | "signup") => Promise<void>
  ensureProfile: (input: {
    name: string
    role: UserRole
    phone: string
  }) => Promise<FirestoreUser>
  linkWedding: (weddingId: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function loadProfile(uid: string): Promise<FirestoreUser | null> {
  const snap = await getDoc(doc(getFirestoreDb(), "users", uid))
  if (!snap.exists()) return null
  return snap.data() as FirestoreUser
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isFirebaseConfigured()
  const [status, setStatus] = useState<AuthStatus>(
    configured ? "loading" : "signedOut"
  )
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<FirestoreUser | null>(null)

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null)
      return
    }
    setProfile(await loadProfile(user.uid))
  }, [user])

  useEffect(() => {
    if (!configured) {
      setStatus("signedOut")
      return
    }
    const auth = getFirebaseAuth()
    return onAuthStateChanged(auth, async (next) => {
      setUser(next)
      if (!next) {
        setProfile(null)
        setStatus("signedOut")
        return
      }
      try {
        setProfile(await loadProfile(next.uid))
      } catch {
        setProfile(null)
      } finally {
        setStatus("signedIn")
      }
    })
  }, [configured])

  const sendOtp = useCallback(async (phone: string, flow: "login" | "signup" = "login") => {
    await sendMobileOtp({ phone: toE164(phone), flow })
  }, [])

  const confirmOtp = useCallback(
    async (phone: string, code: string, flow: "login" | "signup" = "login") => {
      const { token } = await verifyMobileOtp({
        phone: toE164(phone),
        code,
        flow,
      })
      await signInWithCustomToken(getFirebaseAuth(), token)
    },
    []
  )

  const ensureProfile = useCallback(
    async (input: { name: string; role: UserRole; phone: string }) => {
      if (!user) throw new Error("Not signed in")
      const existing = await loadProfile(user.uid)
      const next: FirestoreUser = {
        uid: user.uid,
        role: input.role,
        phone: toE164(input.phone),
        name: input.name.trim(),
        weddingId: existing?.weddingId,
        vendorId: existing?.vendorId,
        email: existing?.email,
        createdAt: existing?.createdAt ?? Date.now(),
      }
      await setDoc(doc(getFirestoreDb(), "users", user.uid), next, { merge: true })
      setProfile(next)
      return next
    },
    [user]
  )

  const linkWedding = useCallback(
    async (weddingId: string) => {
      if (!user || !profile) throw new Error("Not signed in")
      const next = { ...profile, weddingId, role: "family" as const }
      await setDoc(doc(getFirestoreDb(), "users", user.uid), next, { merge: true })
      setProfile(next)
    },
    [user, profile]
  )

  const signOut = useCallback(async () => {
    if (configured) await firebaseSignOut(getFirebaseAuth())
    setUser(null)
    setProfile(null)
    setStatus("signedOut")
  }, [configured])

  const value = useMemo(
    () => ({
      status,
      user,
      profile,
      configured,
      sendOtp,
      confirmOtp,
      ensureProfile,
      linkWedding,
      signOut,
      refreshProfile,
    }),
    [
      status,
      user,
      profile,
      configured,
      sendOtp,
      confirmOtp,
      ensureProfile,
      linkWedding,
      signOut,
      refreshProfile,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
