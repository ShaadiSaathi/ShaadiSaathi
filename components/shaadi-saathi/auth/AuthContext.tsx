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
import {
  onAuthStateChanged,
  signOut,
  type User,
} from "firebase/auth"
import type { VendorCategoryId } from "@/lib/mockVendors"
import { isFirebaseConfigured, getFirebaseAuth } from "@/lib/firebase/config"
import { clearPhoneAuthSession, confirmPhoneOtp, preparePhoneOtpCaptcha, sendPhoneOtp } from "@/lib/firebase/phone-auth"
import { getUserProfile } from "@/lib/firebase/users"
import { getFirestoreDb } from "@/lib/firebase/config"
import { getWedding } from "@/lib/firebase/weddings"
import { friendlyAuthErrorMessage, rawAuthErrorInfo, withTimeout } from "@/lib/firebase/auth-errors"
import { logVerificationError } from "@/lib/firebase/verification-errors"
import { logVerificationSuccess } from "@/lib/firebase/verification-success"
import {
  DEMO_VENDOR_ID,
  DEMO_WEDDING_ID,
  createWeddingForUser,
  ensureFamilyWedding as ensureFamilyWeddingRecord,
  getWeddingForUser,
} from "@/lib/firebase/seed"
import { createVendorForUser, getVendor, getVendorForUser } from "@/lib/firebase/vendors"
import { clearExistingAuthSession } from "@/lib/firebase/clear-auth-session"
import {
  clearPersistedPending,
  readPersistedPending,
  writePersistedPending,
  type PersistedPending,
} from "@/lib/auth/pending-session"
import {
  readTesterModeFromStorage,
  writeTesterModeToStorage,
} from "@/lib/tester-mode"

/**
 * How long to wait for Firebase to accept the SMS send *after* the user has
 * already solved the visible reCAPTCHA. Captcha wait is intentionally uncapped
 * (see preparePhoneOtpCaptcha) so ticking the checkbox can't false-timeout.
 */
const OTP_SEND_TIMEOUT_MS = 60_000

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
  /** False in tester/demo mode so screens use mock data even if Firebase env is set. */
  isFirebaseMode: boolean
  isTesterMode: boolean
  authLoading: boolean
  otpSent: boolean
  loginFamily: (phone: string) => void
  loginVendor: (phone: string) => void
  loginWithGoogle: (role: "family" | "vendor") => void
  /** Staging-only: enter the demo family session without OTP. */
  enterTesterMode: () => void
  startFamilySignup: (data: { name: string; phone: string; password: string }) => void
  startVendorSignup: (data: Omit<VendorAuthUser, "bio" | "coverPhotoPreview"> & { password: string }) => void
  startPasswordReset: (phone: string, role: "family" | "vendor") => void
  sendOtp: () => Promise<void>
  resetOtp: () => void
  verifyOtp: (code: string) => boolean
  confirmOtp: (code: string) => Promise<void>
  completeFamilyOnboarding: (weddingName: string, firstEventDate: string) => Promise<string>
  completeVendorOnboarding: (bio: string, coverPhotoPreview?: string) => Promise<void>
  completePasswordReset: (password: string) => void
  /** Create/relink a wedding when invite link is missing, then return its id. */
  ensureFamilyWedding: () => Promise<string>
  logoutFamily: () => void
  logoutVendor: () => void
  clearPending: () => void
  /** Rehydrate pending from sessionStorage when soft-nav races clear React state. */
  hydratePending: (flow: Exclude<PendingFlow, null>) => PendingSignup | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

const DEFAULT_FAMILY: FamilyUser = {
  name: "Ayesha",
  phone: "+923215550100",
  weddingName: "Ayesha & Bilal's Wedding",
  firstEventDate: "2026-08-08",
}

const DEFAULT_VENDOR: VendorAuthUser = {
  businessName: "Lahore Feast Catering",
  categoryId: "catering",
  city: "Lahore",
  phone: "+923215550198",
  bio: "Authentic Pakistani cuisine with live BBQ counters and elegant walima dinner service.",
}

function toPersistedPending(pending: PendingSignup): PersistedPending {
  return {
    flow: pending.flow as PersistedPending["flow"],
    phone: pending.phone,
    ...(pending.familyName ? { familyName: pending.familyName } : {}),
    ...(pending.vendor
      ? {
          vendor: {
            businessName: pending.vendor.businessName,
            categoryId: pending.vendor.categoryId,
            city: pending.vendor.city,
            phone: pending.vendor.phone,
          },
        }
      : {}),
  }
}

function fromPersistedPending(stored: PersistedPending): PendingSignup {
  return {
    flow: stored.flow,
    phone: stored.phone,
    ...(stored.familyName ? { familyName: stored.familyName } : {}),
    ...(stored.vendor ? { vendor: stored.vendor } : {}),
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const firebaseConfigured = isFirebaseConfigured()
  const [testerMode, setTesterMode] = useState(false)
  const [familyUser, setFamilyUser] = useState<FamilyUser | null>(null)
  const [vendorUser, setVendorUser] = useState<VendorAuthUser | null>(null)
  const [pending, setPendingState] = useState<PendingSignup | null>(() => {
    const stored = readPersistedPending()
    return stored ? fromPersistedPending(stored) : null
  })
  const [loginSuccessMessage, setLoginSuccessMessage] = useState<string | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [weddingId, setWeddingId] = useState<string | null>(null)
  const [vendorId, setVendorId] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(firebaseConfigured)
  const [otpSent, setOtpSent] = useState(false)

  const setPending = useCallback((next: PendingSignup | null) => {
    setPendingState(next)
    if (next) writePersistedPending(toPersistedPending(next))
    else clearPersistedPending()
  }, [])

  const hydratePending = useCallback(
    (flow: Exclude<PendingFlow, null>): PendingSignup | null => {
      if (pending?.flow === flow && pending.phone) return pending
      const stored = readPersistedPending()
      if (!stored || stored.flow !== flow || !stored.phone) return null
      const restored = fromPersistedPending(stored)
      // Restore React state without rewriting storage (already correct).
      setPendingState(restored)
      return restored
    },
    [pending]
  )

  // When tester mode is on, treat the app like local mock mode (populated demo data).
  const isFirebaseMode = firebaseConfigured && !testerMode

  useEffect(() => {
    if (!readTesterModeFromStorage()) return
    setTesterMode(true)
    setFamilyUser(DEFAULT_FAMILY)
    setWeddingId(DEMO_WEDDING_ID)
    setVendorUser(null)
    setVendorId(null)
    setAuthLoading(false)
  }, [])

  useEffect(() => {
    if (!firebaseConfigured || testerMode) {
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
          // Only expose a weddingId that actually resolves — stale ids would
          // produce invite URLs that 404 on the public wedding page.
          const id = await getWeddingForUser(user.uid)
          let weddingName = ""
          let firstEventDate = ""
          if (id) {
            const wedding = await getWedding(id)
            if (wedding) {
              weddingName = wedding.name
              firstEventDate = wedding.firstEventDate
            }
          }
          setWeddingId(id)
          setVendorId(null)
          setVendorUser(null)
          setFamilyUser({
            name: profile.name,
            phone: profile.phone,
            weddingName,
            firstEventDate,
            uid: user.uid,
          })
        } else if (profile?.role === "vendor") {
          const vendor = profile.vendorId
            ? await getVendor(profile.vendorId)
            : await getVendorForUser(user.uid)
          setVendorId(vendor?.id ?? profile.vendorId ?? null)
          setWeddingId(null)
          setFamilyUser(null)
          setVendorUser({
            businessName: vendor?.businessName ?? profile.name,
            categoryId: vendor?.categoryId ?? "catering",
            city: vendor?.city ?? "",
            phone: vendor?.phone ?? profile.phone,
            bio: vendor?.bio ?? "",
            uid: user.uid,
          })
        }
      } catch {
        // profile may not exist yet during onboarding
      }
      setAuthLoading(false)
    })

    return unsub
  }, [firebaseConfigured, testerMode])

  const enterTesterMode = useCallback(() => {
    writeTesterModeToStorage(true)
    setTesterMode(true)
    setPending(null)
    setOtpSent(false)
    setFamilyUser(DEFAULT_FAMILY)
    setWeddingId(DEMO_WEDDING_ID)
    setVendorUser(null)
    setVendorId(null)
    setAuthLoading(false)
  }, [])

  const loginFamily = useCallback((phone: string) => {
    // Always route through phone verification — never sign a family in directly.
    // `phone` is already an E.164 string from the international phone input.
    setPending({ flow: "family-login", phone })
  }, [])

  const loginVendor = useCallback(
    (phone: string) => {
      if (isFirebaseMode) {
        setPending({ flow: "vendor-login", phone })
        return
      }
      setVendorUser({ ...DEFAULT_VENDOR, phone })
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
        phone: data.phone,
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
        phone: data.phone,
        password: data.password,
        vendor: {
          businessName: data.businessName,
          categoryId: data.categoryId,
          city: data.city,
          phone: data.phone,
        },
      })
    },
    []
  )

  const startPasswordReset = useCallback((phone: string, role: "family" | "vendor") => {
    setPending({
      flow: role === "family" ? "family-reset" : "vendor-reset",
      phone,
    })
  }, [])

  const sendOtp = useCallback(async () => {
    // Soft-nav to /login/verify can render before React flushes setPending —
    // fall back to sessionStorage so we never throw "No phone number".
    const active =
      pending?.phone
        ? pending
        : (() => {
            const stored = readPersistedPending()
            return stored ? fromPersistedPending(stored) : null
          })()
    if (!active?.phone) throw new Error("No phone number")
    if (active !== pending) setPendingState(active)

    try {
      // Drop any existing family/vendor Firebase session so phone verify isn't
      // stuck behind a prior sign-in when switching portals in the same browser.
      await clearExistingAuthSession()
      // Captcha wait is uncapped — timeout only applies to the SMS send itself.
      await preparePhoneOtpCaptcha()
      const { verificationId } = await withTimeout(
        sendPhoneOtp(active.phone),
        OTP_SEND_TIMEOUT_MS
      )
      void logVerificationSuccess({
        flow: active.flow ?? "unknown",
        phone: active.phone,
        verificationId,
        uid: isFirebaseMode ? getFirebaseAuth().currentUser?.uid ?? "" : "",
      })
      setOtpSent(true)
    } catch (err) {
      const { code, message } = friendlyAuthErrorMessage(err)
      const { rawCode, rawMessage } = rawAuthErrorInfo(err)
      void logVerificationError({
        flow: active.flow ?? "unknown",
        stage: "send",
        code,
        message,
        rawCode,
        rawMessage,
        phone: active.phone,
        uid: isFirebaseMode ? getFirebaseAuth().currentUser?.uid ?? "" : "",
      })
      throw new Error(message)
    }
  }, [pending, isFirebaseMode])

  const resetOtp = useCallback(() => {
    clearPhoneAuthSession()
    setOtpSent(false)
  }, [])

  // Pure client-side FORMAT check only. This never grants access — it just lets
  // the UI reject obviously-malformed input before we ask the server to confirm.
  const verifyOtp = useCallback((code: string) => /^\d{6}$/.test(code), [])

  const confirmOtp = useCallback(
    async (code: string) => {
      try {
        await confirmPhoneOtp(code)
      } catch (err) {
        const { code: errorCode, message } = friendlyAuthErrorMessage(err)
        const { rawCode, rawMessage } = rawAuthErrorInfo(err)
        void logVerificationError({
          flow: pending?.flow ?? "unknown",
          stage: "confirm",
          code: errorCode,
          message,
          rawCode,
          rawMessage,
          phone: pending?.phone ?? "",
          uid: isFirebaseMode ? getFirebaseAuth().currentUser?.uid ?? "" : "",
        })
        throw new Error(message)
      }
      setOtpSent(false)

      const user = getFirebaseAuth().currentUser
      if (!user || !pending) return

      if (pending.flow === "family-login") {
        const id = await getWeddingForUser(user.uid)
        const profile = await getUserProfile(getFirestoreDb(), user.uid)
        let weddingName = ""
        let firstEventDate = ""
        if (id) {
          const wedding = await getWedding(id)
          if (wedding) {
            weddingName = wedding.name
            firstEventDate = wedding.firstEventDate
          }
        }
        setWeddingId(id)
        setFamilyUser({
          name: profile?.name ?? "",
          phone: pending.phone,
          weddingName,
          firstEventDate,
          uid: user.uid,
        })
        setPending(null)
      } else if (pending.flow === "vendor-login") {
        const profile = await getUserProfile(getFirestoreDb(), user.uid)
        const vendor =
          (profile?.vendorId ? await getVendor(profile.vendorId) : null) ??
          (await getVendorForUser(user.uid))

        if (!vendor) {
          throw new Error(
            "This number isn't registered as a vendor yet. Please list your business first, then log in."
          )
        }

        setVendorId(vendor.id)
        setVendorUser({
          businessName: vendor.businessName,
          categoryId: vendor.categoryId,
          city: vendor.city,
          phone: vendor.phone || pending.phone,
          bio: vendor.bio,
          uid: user.uid,
        })
        setPending(null)
      }
    },
    [isFirebaseMode, pending]
  )

  const completeFamilyOnboarding = useCallback(
    async (weddingName: string, firstEventDate: string) => {
      if (!pending?.familyName) {
        throw new Error("Signup session expired. Please start again.")
      }

      const authUser =
        firebaseUser ?? (isFirebaseMode ? getFirebaseAuth().currentUser : null)

      if (isFirebaseMode) {
        if (!authUser) {
          throw new Error("Sign-in expired. Please verify your phone again.")
        }
        const id = await createWeddingForUser(
          authUser.uid,
          pending.familyName,
          pending.phone,
          weddingName.trim(),
          firstEventDate
        )
        setWeddingId(id)
        setFamilyUser({
          name: pending.familyName,
          phone: pending.phone,
          weddingName: weddingName.trim(),
          firstEventDate,
          uid: authUser.uid,
        })
        setPending(null)
        return id
      }

      setFamilyUser({
        name: pending.familyName,
        phone: pending.phone,
        weddingName: weddingName.trim(),
        firstEventDate,
      })
      setWeddingId(DEMO_WEDDING_ID)
      setPending(null)
      return DEMO_WEDDING_ID
    },
    [pending, isFirebaseMode, firebaseUser]
  )

  const ensureFamilyWedding = useCallback(async () => {
    if (!isFirebaseMode) {
      setWeddingId(DEMO_WEDDING_ID)
      return DEMO_WEDDING_ID
    }

    const authUser = firebaseUser ?? getFirebaseAuth().currentUser
    if (!authUser) {
      throw new Error("Sign in to generate your wedding invite link.")
    }

    const profile = await getUserProfile(getFirestoreDb(), authUser.uid)
    const name = familyUser?.name || profile?.name || "Family"
    const phone = familyUser?.phone || profile?.phone || ""
    if (!phone) {
      throw new Error("Finish wedding setup to generate your invite link.")
    }

    const weddingName =
      familyUser?.weddingName?.trim() || `${name}'s Wedding`
    const firstEventDate =
      familyUser?.firstEventDate?.trim() ||
      new Date().toISOString().slice(0, 10)

    const id = await ensureFamilyWeddingRecord(
      authUser.uid,
      name,
      phone,
      weddingName,
      firstEventDate
    )
    setWeddingId(id)
    setFamilyUser({
      name,
      phone,
      weddingName,
      firstEventDate,
      uid: authUser.uid,
    })
    return id
  }, [isFirebaseMode, firebaseUser, familyUser])

  const completeVendorOnboarding = useCallback(
    async (bio: string, coverPhotoPreview?: string) => {
      if (!pending?.vendor) {
        throw new Error("Signup session expired. Please start again.")
      }

      if (isFirebaseMode) {
        const authUser = firebaseUser ?? getFirebaseAuth().currentUser
        if (!authUser) {
          throw new Error("Sign-in expired. Please verify your phone again.")
        }
        const id = await createVendorForUser(authUser.uid, {
          ...pending.vendor,
          bio: bio.trim(),
        })
        setVendorId(id)
        setVendorUser({
          ...pending.vendor,
          bio: bio.trim(),
          coverPhotoPreview,
          uid: authUser.uid,
        })
      } else {
        setVendorUser({
          ...pending.vendor,
          bio: bio.trim(),
          coverPhotoPreview,
        })
        setVendorId(DEMO_VENDOR_ID)
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
    if (testerMode) {
      writeTesterModeToStorage(false)
      setTesterMode(false)
      setFamilyUser(null)
      setWeddingId(null)
      return
    }
    if (isFirebaseMode) {
      await signOut(getFirebaseAuth())
      clearPhoneAuthSession()
    }
    setFamilyUser(null)
    setWeddingId(null)
  }, [isFirebaseMode, testerMode])

  const logoutVendor = useCallback(async () => {
    if (testerMode) {
      writeTesterModeToStorage(false)
      setTesterMode(false)
      setVendorUser(null)
      setVendorId(null)
      return
    }
    if (isFirebaseMode) {
      await signOut(getFirebaseAuth())
      clearPhoneAuthSession()
    }
    setVendorUser(null)
    setVendorId(null)
  }, [isFirebaseMode, testerMode])

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
      isTesterMode: testerMode,
      authLoading,
      otpSent,
      loginFamily,
      loginVendor,
      loginWithGoogle,
      enterTesterMode,
      startFamilySignup,
      startVendorSignup,
      startPasswordReset,
      sendOtp,
      resetOtp,
      verifyOtp,
      confirmOtp,
      completeFamilyOnboarding,
      completeVendorOnboarding,
      completePasswordReset,
      ensureFamilyWedding,
      logoutFamily,
      logoutVendor,
      clearPending,
      hydratePending,
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
      testerMode,
      authLoading,
      otpSent,
      loginFamily,
      loginVendor,
      loginWithGoogle,
      enterTesterMode,
      startFamilySignup,
      startVendorSignup,
      startPasswordReset,
      sendOtp,
      resetOtp,
      verifyOtp,
      confirmOtp,
      completeFamilyOnboarding,
      completeVendorOnboarding,
      completePasswordReset,
      ensureFamilyWedding,
      logoutFamily,
      logoutVendor,
      clearPending,
      hydratePending,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
