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
import { onAuthStateChanged, signOut, type User } from "firebase/auth"
import type { VendorCategoryId } from "@/lib/mockVendors"
import { isFirebaseConfigured, getFirebaseAuth } from "@/lib/firebase/config"
import { clearPhoneAuthSession, confirmPhoneOtp, sendPhoneOtp } from "@/lib/firebase/phone-auth"
import { getUserProfile } from "@/lib/firebase/users"
import { getFirestoreDb } from "@/lib/firebase/config"
import { ensureDemoVendorSeeded, ensureDemoWeddingSeeded } from "@/lib/firebase/seed"

export interface FamilyUser {
  name: string
  phone: string
  weddingName: string
  firstEventDate: string
  uid?: string
}

export interface VendorAuthUser {
  businessName: string
  categoryId: VendorCategoryId
  city: string
  phone: string
  bio: string
  coverPhotoPreview?: string
  uid?: string
}

export type PendingFlow =
  | "family-signup"
  | "vendor-signup"
  | "family-reset"
  | "vendor-reset"
  | "family-login"
  | "vendor-login"
  | null

interface PendingSignup {
  flow: PendingFlow
  phone: string
  password?: string
  familyName?: string
  vendor?: Omit<VendorAuthUser, "bio" | "coverPhotoPreview">
}

interface AuthContextValue {
  familyUser: FamilyUser | null
  vendorUser: VendorAuthUser | null
  isFamilyLoggedIn: boolean
  isVendorLoggedIn: boolean
  pending: PendingSignup | null
  loginSuccessMessage: string | null
  setLoginSuccessMessage: (msg: string | null) => void
  weddingId: string | null
  vendorId: string | null
  firebaseUser: User | null
  isFirebaseMode: boolean
  authLoading: boolean
  otpSent: boolean
  loginFamily: (phone: string) => void
  loginVendor: (phone: string) => void
  loginWithGoogle: (role: "family" | "vendor") => void
  startFamilySignup: (data: { name: string; phone: string; password: string }) => void
  startVendorSignup: (data: Omit<VendorAuthUser, "bio" | "coverPhotoPreview"> & { password: string }) => void
  startPasswordReset: (phone: string, role: "family" | "vendor") => void
  sendOtp: () => Promise<void>
  verifyOtp: (code: string) => boolean
  confirmOtp: (code: string) => Promise<void>
  completeFamilyOnboarding: (weddingName: string, firstEventDate: string) => void
  completeVendorOnboarding: (bio: string, coverPhotoPreview?: string) => void
  completePasswordReset: (password: string) => void
  logoutFamily: () => void
  logoutVendor: () => void
  clearPending: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const DEFAULT_FAMILY: FamilyUser = {
  name: "Ayesha",
  phone: "3215550100",
  weddingName: "Ayesha & Bilal's Wedding",
  firstEventDate: "2026-08-08",
}

const DEFAULT_VENDOR: VendorAuthUser = {
  businessName: "Lahore Feast Catering",
  categoryId: "catering",
  city: "Lahore",
  phone: "3215550198",
  bio: "Authentic Pakistani cuisine with live BBQ counters and elegant walima dinner service.",
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const isFirebaseMode = isFirebaseConfigured()
  const [familyUser, setFamilyUser] = useState<FamilyUser | null>(null)
  const [vendorUser, setVendorUser] = useState<VendorAuthUser | null>(null)
  const [pending, setPending] = useState<PendingSignup | null>(null)
  const [loginSuccessMessage, setLoginSuccessMessage] = useState<string | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [weddingId, setWeddingId] = useState<string | null>(null)
  const [vendorId, setVendorId] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(isFirebaseMode)
  const [otpSent, setOtpSent] = useState(false)

  useEffect(() => {
    if (!isFirebaseMode) {
      setAuthLoading(false)
      return
    }

    const auth = getFirebaseAuth()
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user)
      if (!user) {
        setFamilyUser(null)
        setVendorUser(null)
        setWeddingId(null)
        setVendorId(null)
        setAuthLoading(false)
        return
      }

      try {
        const profile = await getUserProfile(getFirestoreDb(), user.uid)
        if (profile?.role === "family") {
          setWeddingId(profile.weddingId ?? null)
          setVendorId(null)
          setVendorUser(null)
          setFamilyUser({
            name: profile.name,
            phone: profile.phone,
            weddingName: DEFAULT_FAMILY.weddingName,
            firstEventDate: DEFAULT_FAMILY.firstEventDate,
            uid: user.uid,
          })
        } else if (profile?.role === "vendor") {
          setVendorId(profile.vendorId ?? null)
          setWeddingId(null)
          setFamilyUser(null)
          setVendorUser({
            businessName: profile.name,
            categoryId: DEFAULT_VENDOR.categoryId,
            city: DEFAULT_VENDOR.city,
            phone: profile.phone,
            bio: DEFAULT_VENDOR.bio,
            uid: user.uid,
          })
        }
      } catch {
        // profile may not exist yet during onboarding
      }
      setAuthLoading(false)
    })

    return unsub
  }, [isFirebaseMode])

  const loginFamily = useCallback(
    (phone: string) => {
      const normalized = phone.replace(/\D/g, "").slice(-10)
      if (isFirebaseMode) {
        setPending({ flow: "family-login", phone: normalized })
        return
      }
      setFamilyUser({ ...DEFAULT_FAMILY, phone: normalized })
    },
    [isFirebaseMode]
  )

  const loginVendor = useCallback(
    (phone: string) => {
      const normalized = phone.replace(/\D/g, "").slice(-10)
      if (isFirebaseMode) {
        setPending({ flow: "vendor-login", phone: normalized })
        return
      }
      setVendorUser({ ...DEFAULT_VENDOR, phone: normalized })
    },
    [isFirebaseMode]
  )

  const loginWithGoogle = useCallback(
    (role: "family" | "vendor") => {
      if (role === "family") {
        setFamilyUser(DEFAULT_FAMILY)
      } else {
        setVendorUser(DEFAULT_VENDOR)
      }
    },
    []
  )

  const startFamilySignup = useCallback(
    (data: { name: string; phone: string; password: string }) => {
      setPending({
        flow: "family-signup",
        phone: data.phone.replace(/\D/g, "").slice(-10),
        password: data.password,
        familyName: data.name.trim(),
      })
    },
    []
  )

  const startVendorSignup = useCallback(
    (data: Omit<VendorAuthUser, "bio" | "coverPhotoPreview"> & { password: string }) => {
      setPending({
        flow: "vendor-signup",
        phone: data.phone.replace(/\D/g, "").slice(-10),
        password: data.password,
        vendor: {
          businessName: data.businessName,
          categoryId: data.categoryId,
          city: data.city,
          phone: data.phone.replace(/\D/g, "").slice(-10),
        },
      })
    },
    []
  )

  const startPasswordReset = useCallback((phone: string, role: "family" | "vendor") => {
    setPending({
      flow: role === "family" ? "family-reset" : "vendor-reset",
      phone: phone.replace(/\D/g, "").slice(-10),
    })
  }, [])

  const sendOtp = useCallback(async () => {
    if (!pending?.phone) throw new Error("No phone number")
    if (!isFirebaseMode) {
      setOtpSent(true)
      return
    }
    await sendPhoneOtp(pending.phone)
    setOtpSent(true)
  }, [pending, isFirebaseMode])

  const verifyOtp = useCallback(
    (code: string) => {
      if (!isFirebaseMode) return /^\d{6}$/.test(code)
      return /^\d{6}$/.test(code)
    },
    [isFirebaseMode]
  )

  const confirmOtp = useCallback(
    async (code: string) => {
      if (!isFirebaseMode) {
        if (!/^\d{6}$/.test(code)) throw new Error("Invalid code")
        return
      }
      await confirmPhoneOtp(code)
      setOtpSent(false)

      const user = getFirebaseAuth().currentUser
      if (!user || !pending) return

      if (pending.flow === "family-login") {
        const id = await ensureDemoWeddingSeeded(
          user.uid,
          DEFAULT_FAMILY.name,
          pending.phone
        )
        setWeddingId(id)
        setFamilyUser({ ...DEFAULT_FAMILY, phone: pending.phone, uid: user.uid })
        setPending(null)
      } else if (pending.flow === "vendor-login") {
        const id = await ensureDemoVendorSeeded(user.uid, {
          businessName: DEFAULT_VENDOR.businessName,
          categoryId: DEFAULT_VENDOR.categoryId,
          city: DEFAULT_VENDOR.city,
          phone: pending.phone,
          bio: DEFAULT_VENDOR.bio,
        })
        setVendorId(id)
        setVendorUser({ ...DEFAULT_VENDOR, phone: pending.phone, uid: user.uid })
        setPending(null)
      }
    },
    [isFirebaseMode, pending]
  )

  const completeFamilyOnboarding = useCallback(
    async (weddingName: string, firstEventDate: string) => {
      if (!pending?.familyName) return

      if (isFirebaseMode && firebaseUser) {
        const id = await ensureDemoWeddingSeeded(
          firebaseUser.uid,
          pending.familyName,
          pending.phone,
          weddingName.trim()
        )
        setWeddingId(id)
        setFamilyUser({
          name: pending.familyName,
          phone: pending.phone,
          weddingName: weddingName.trim(),
          firstEventDate,
          uid: firebaseUser.uid,
        })
      } else {
        setFamilyUser({
          name: pending.familyName,
          phone: pending.phone,
          weddingName: weddingName.trim(),
          firstEventDate,
        })
      }
      setPending(null)
    },
    [pending, isFirebaseMode, firebaseUser]
  )

  const completeVendorOnboarding = useCallback(
    async (bio: string, coverPhotoPreview?: string) => {
      if (!pending?.vendor) return

      if (isFirebaseMode && firebaseUser) {
        const id = await ensureDemoVendorSeeded(firebaseUser.uid, {
          ...pending.vendor,
          bio: bio.trim(),
        })
        setVendorId(id)
        setVendorUser({
          ...pending.vendor,
          bio: bio.trim(),
          coverPhotoPreview,
          uid: firebaseUser.uid,
        })
      } else {
        setVendorUser({
          ...pending.vendor,
          bio: bio.trim(),
          coverPhotoPreview,
        })
      }
      setPending(null)
    },
    [pending, isFirebaseMode, firebaseUser]
  )

  const completePasswordReset = useCallback((_password: string) => {
    setPending(null)
  }, [])

  const clearPending = useCallback(() => {
    clearPhoneAuthSession()
    setOtpSent(false)
    setPending(null)
  }, [])

  const logoutFamily = useCallback(async () => {
    if (isFirebaseMode) {
      await signOut(getFirebaseAuth())
      clearPhoneAuthSession()
    }
    setFamilyUser(null)
    setWeddingId(null)
  }, [isFirebaseMode])

  const logoutVendor = useCallback(async () => {
    if (isFirebaseMode) {
      await signOut(getFirebaseAuth())
      clearPhoneAuthSession()
    }
    setVendorUser(null)
    setVendorId(null)
  }, [isFirebaseMode])

  const value = useMemo(
    () => ({
      familyUser,
      vendorUser,
      isFamilyLoggedIn: familyUser !== null,
      isVendorLoggedIn: vendorUser !== null,
      pending,
      loginSuccessMessage,
      setLoginSuccessMessage,
      weddingId,
      vendorId,
      firebaseUser,
      isFirebaseMode,
      authLoading,
      otpSent,
      loginFamily,
      loginVendor,
      loginWithGoogle,
      startFamilySignup,
      startVendorSignup,
      startPasswordReset,
      sendOtp,
      verifyOtp,
      confirmOtp,
      completeFamilyOnboarding,
      completeVendorOnboarding,
      completePasswordReset,
      logoutFamily,
      logoutVendor,
      clearPending,
    }),
    [
      familyUser,
      vendorUser,
      pending,
      loginSuccessMessage,
      weddingId,
      vendorId,
      firebaseUser,
      isFirebaseMode,
      authLoading,
      otpSent,
      loginFamily,
      loginVendor,
      loginWithGoogle,
      startFamilySignup,
      startVendorSignup,
      startPasswordReset,
      sendOtp,
      verifyOtp,
      confirmOtp,
      completeFamilyOnboarding,
      completeVendorOnboarding,
      completePasswordReset,
      logoutFamily,
      logoutVendor,
      clearPending,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
