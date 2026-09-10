export type UserRole = "family" | "vendor"

export type FirestoreUser = {
  uid: string
  role: UserRole
  phone: string
  name: string
  email?: string
  weddingId?: string
  vendorId?: string
  createdAt: number
}

export type FirestoreWedding = {
  id: string
  name: string
  couple?: string
  shareCode?: string
  isPremium?: boolean
  ownerId: string
  memberUids: string[]
  organiserName?: string
  organiserPhone?: string
  firstEventDate?: string
  createdAt?: number
}

export type GuestRsvp = Record<string, "pending" | "yes" | "no" | "maybe">

export type AppGuest = {
  id: string
  name: string
  phone: string
  events: string[]
  rsvp: GuestRsvp
  weddingId?: string
}

export type AppTask = {
  id: string
  title: string
  assignee: string
  dueDate: string
  status: "todo" | "doing" | "done" | "blocked"
  weddingId?: string
}

export type AppVendor = {
  id: string
  name: string
  category?: string
  city?: string
  rating?: number
  verificationStatus?: string
  suspended?: boolean
}
