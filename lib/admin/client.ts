import { getFirebaseAuth } from "@/lib/firebase/config"

async function adminFetch(path: string, init?: RequestInit): Promise<Response> {
  const user = getFirebaseAuth().currentUser
  if (!user) {
    throw new Error("Not signed in")
  }

  const token = await user.getIdToken()
  return fetch(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
    cache: "no-store",
  })
}

export async function fetchAdminMe(): Promise<{ ok: boolean; phone?: string }> {
  const res = await adminFetch("/api/admin/me")
  if (res.status === 403 || res.status === 401) {
    return { ok: false }
  }
  if (!res.ok) {
    throw new Error("Could not verify admin access")
  }
  const data = (await res.json()) as { ok?: boolean; phone?: string }
  return { ok: data.ok === true, phone: data.phone }
}

export type AdminOverview = {
  stats: {
    weddings: number
    guests: number
    bookings: {
      requested: number
      confirmed: number
      completed: number
      disputed: number
      declined: number
      no_show: number
      other: number
      total: number
    }
  }
  recentWeddings: Array<{
    id: string
    name: string
    couple: string
    organiserPhone: string
    createdAt: number
  }>
  recentErrors: Array<{
    id: string
    flow: string
    phone: string
    rawCode: string
    code: string
    stage: string
    timestamp: number
  }>
  recentSuccesses: Array<{
    id: string
    flow: string
    phone: string
    channel: string
    stage: string
    timestamp: number
  }>
}

export async function fetchAdminOverview(): Promise<AdminOverview> {
  const res = await adminFetch("/api/admin/overview")
  if (!res.ok) {
    throw new Error("Could not load admin overview")
  }
  return (await res.json()) as AdminOverview
}

export type AdminDispute = {
  id: string
  weddingId: string
  weddingName: string
  familyName: string
  vendorId: string
  vendorName: string
  agreedAmount: number
  disputedAmount: number | null
  status: string
  dispute: {
    status: string
    category?: string
    description: string
    familyReason?: string
    vendorResponse?: string
    evidenceFileName?: string
    submittedAt: number
    resolution?: string
  }
  messages: Array<{
    id: string
    senderType: string
    text: string
    timestamp: number
  }>
}

export async function fetchAdminDisputes(): Promise<AdminDispute[]> {
  const res = await adminFetch("/api/admin/disputes")
  if (!res.ok) {
    throw new Error("Could not load disputes")
  }
  const data = (await res.json()) as { disputes: AdminDispute[] }
  return data.disputes
}

export async function resolveAdminDispute(
  bookingId: string,
  input: {
    resolution: "family" | "vendor" | "split"
    splitFamilyAmount?: number
  }
): Promise<void> {
  const res = await adminFetch(`/api/admin/disputes/${bookingId}/resolve`, {
    method: "POST",
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(data.message ?? "Could not resolve dispute")
  }
}

export type AdminUserLookup = {
  queryPhone: string
  authUid: string | null
  user: {
    uid: string
    role: string
    name: string
    phone: string
    weddingId: string | null
    vendorId: string | null
    createdAt: number
  } | null
  wedding: {
    id: string
    name: string
    couple: string
    shareCode: string
    organiserName: string
    organiserPhone: string
    firstEventDate: string
    isPremium: boolean
    ownerId: string
    memberCount: number
    createdAt: number
  } | null
  counts: {
    guests: number
    tasks: number
    bookings: number
  }
  bookings: Array<{
    id: string
    vendorName: string
    status: string
    price: number
    eventId: string
    createdAt: number
  }>
}

export async function fetchAdminUserLookup(phone: string): Promise<AdminUserLookup> {
  const params = new URLSearchParams({ phone })
  const res = await adminFetch(`/api/admin/users?${params.toString()}`)
  if (res.status === 404) {
    const data = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(data.message ?? "No user found")
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(data.message ?? "Could not look up user")
  }
  return (await res.json()) as AdminUserLookup
}

export type AdminPendingVendor = {
  id: string
  businessName: string
  city: string
  phone: string
  ownerUid: string
  verificationStatus: "pending"
  verificationCnic: string
  verificationBusinessName: string
  verificationCity: string
  verificationSubmittedAt: number
  createdAt: number
}

export async function fetchAdminPendingVendors(): Promise<AdminPendingVendor[]> {
  const res = await adminFetch("/api/admin/vendors/verification")
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(data.message ?? "Could not load pending verifications")
  }
  const data = (await res.json()) as { vendors: AdminPendingVendor[] }
  return data.vendors
}

export async function reviewAdminVendorVerification(
  vendorId: string,
  input: { action: "approve" | "reject"; rejectionReason?: string }
): Promise<void> {
  const res = await adminFetch(`/api/admin/vendors/${vendorId}/verification`, {
    method: "POST",
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(data.message ?? "Could not update verification")
  }
}

export type AdminAutomationLog = {
  id: string
  action: string
  bookingId: string
  weddingId?: string
  vendorId?: string
  message: string
  details?: Record<string, string | number | boolean | null>
  createdAt: number
  source: string
}

export async function fetchAdminAutomationLogs(
  limit = 40
): Promise<AdminAutomationLog[]> {
  const res = await adminFetch(`/api/admin/automation-logs?limit=${limit}`)
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(data.message ?? "Could not load automation logs")
  }
  const data = (await res.json()) as { logs: AdminAutomationLog[] }
  return data.logs
}
