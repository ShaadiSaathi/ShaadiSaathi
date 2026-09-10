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

export type EventOverride = {
  date?: string
  time?: string
  rsvpLockHoursBefore?: number | null
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
  eventOverrides?: Partial<Record<string, EventOverride>>
  timezone?: string
}

export type GuestRsvp = Record<string, "pending" | "yes" | "no" | "maybe" | null>

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
  status: "todo" | "doing" | "in_progress" | "done" | "blocked"
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

export type AppBooking = {
  id: string
  weddingId: string
  vendorId: string
  vendorName: string
  weddingName?: string
  familyName?: string
  eventId?: string
  eventDate?: string
  status: string
  price: number
  packageName?: string
  note?: string
  createdAt?: number
}

export type AppNotification = {
  id: string
  recipientUid: string
  message: string
  type: string
  read: boolean
  createdAt: number
  weddingId?: string
  bookingId?: string
  taskId?: string
}
