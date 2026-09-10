export type UserRole = "family" | "vendor"

export type EventId = "mehndi" | "baraat" | "walima"

export type RsvpStatus = "confirmed" | "pending" | "declined" | "cancelled"

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

export type GuestRsvp = Partial<Record<EventId, RsvpStatus | null>>

export type AppGuest = {
  id: string
  name: string
  phone: string
  events: EventId[]
  rsvp: GuestRsvp
  weddingId?: string
  inviteToken?: string
  notes?: string
}

export type AppTask = {
  id: string
  title: string
  assignee: string
  dueDate: string
  status: "todo" | "doing" | "in_progress" | "done" | "blocked"
  weddingId?: string
  eventId?: EventId
}

export type VendorPackage = {
  name: string
  price: number
  description?: string
  perHead?: boolean
}

export type AppVendor = {
  id: string
  name: string
  category?: string
  categoryId?: string
  city?: string
  rating?: number
  reviewCount?: number
  startingPrice?: number
  bio?: string
  packages?: VendorPackage[]
  verificationStatus?: string
  suspended?: boolean
  availableFor?: EventId[]
}

export type AppBooking = {
  id: string
  weddingId: string
  vendorId: string
  vendorName: string
  weddingName?: string
  familyName?: string
  eventId?: EventId | string
  eventDate?: string
  status: string
  price: number
  packageName?: string
  note?: string
  createdAt?: number
  counterOffer?: {
    price: number
    note?: string
    proposedBy?: string
    proposedAt?: number
  }
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

export type ChatMessage = {
  id: string
  bookingId?: string
  senderId: string
  senderType: "family" | "vendor"
  senderName?: string
  text: string
  timestamp: number
}
