export type AuthUser = {
  email: string
  name: string
  password: string
}

export type UserProfile = {
  gender: "male" | "female"
  age: number
  heightCm: number
  weightKg: number
  ethnicity?: string
  goals: string[]
  experience: string
  units: "metric" | "imperial"
  onboardingComplete: boolean
  memberSince: string
}

export type ScanRecord = {
  id: string
  date: string
  gender: "male" | "female"
  scanType: "front" | "profile"
  overall: number
  breakdown: import("@/lib/face-analysis").BreakdownItem[]
}

const AUTH_KEY = "refineAuth"
const PROFILE_KEY = "userProfile"
const SCANS_KEY = "scanHistory"

export function getAuthUser(): AuthUser | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

export function setAuthUser(user: AuthUser) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user))
}

export function clearAuthUser() {
  localStorage.removeItem(AUTH_KEY)
}

export function getUserProfile(): UserProfile | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    return raw ? (JSON.parse(raw) as UserProfile) : null
  } catch {
    return null
  }
}

export function setUserProfile(profile: UserProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

export function updateUserProfile(partial: Partial<UserProfile>) {
  const current = getUserProfile()
  if (!current) return
  setUserProfile({ ...current, ...partial })
}

export function getScanHistory(): ScanRecord[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(SCANS_KEY)
    return raw ? (JSON.parse(raw) as ScanRecord[]) : []
  } catch {
    return []
  }
}

export function addScanRecord(scan: Omit<ScanRecord, "id" | "date">) {
  const history = getScanHistory()
  const record: ScanRecord = {
    ...scan,
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
  }
  localStorage.setItem(SCANS_KEY, JSON.stringify([record, ...history]))
  return record
}

export function clearScanHistory() {
  localStorage.removeItem(SCANS_KEY)
}

export function signOut() {
  clearAuthUser()
}

export function isAuthenticated(): boolean {
  return getAuthUser() !== null
}
