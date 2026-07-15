import type { EventId, RsvpSource, RsvpStatus } from "@/lib/mockData"
import type { InviteThemeId } from "@/lib/premium"
import type { BookingStatus, VendorCategoryId } from "@/lib/mockVendors"
import type { PaymentPath } from "@/lib/mockPayments"

export type UserRole = "family" | "vendor"

export interface FirestoreUser {
  uid: string
  role: UserRole
  phone: string
  name: string
  weddingId?: string
  vendorId?: string
  createdAt: number
}

export interface FirestoreWedding {
  id: string
  name: string
  couple: string
  shareCode: string
  isPremium: boolean
  inviteTheme: InviteThemeId
  /** Firebase Auth UID of the account that created this wedding */
  ownerId: string
  memberUids: string[]
  organiserName: string
  organiserPhone: string
  firstEventDate: string
  createdAt: number
}

export type TaskStatusValue = "todo" | "in_progress" | "done"

export interface FirestoreTask {
  id: string
  weddingId: string
  title: string
  /** Free-text name of the person responsible */
  assignee: string
  dueDate: string
  status: TaskStatusValue
  eventId?: EventId
  priority?: "low" | "medium" | "high"
  createdAt: number
}

export interface FirestoreGuest {
  id: string
  weddingId: string
  name: string
  phone: string
  events: EventId[]
  rsvp: Record<EventId, RsvpStatus | null>
  rsvpSource: Record<EventId, RsvpSource | null>
  inviteToken: string
  notes?: string
  updatedAt: number
}

export interface FirestoreVendor {
  id: string
  businessName: string
  categoryId: VendorCategoryId
  city: string
  phone: string
  bio: string
  ownerUid: string
  subscriptionTier: "basic" | "featured"
  createdAt: number
}

export interface FirestoreBooking {
  id: string
  weddingId: string
  vendorId: string
  eventId: EventId
  status: BookingStatus
  price: number
  packageName?: string
  guestCount?: number
  note?: string
  paymentPath: PaymentPath
  familyName: string
  weddingName: string
  vendorName: string
  createdAt: number
  /** Per-user last read timestamp for unread badges */
  lastReadByFamily?: number
  lastReadByVendor?: number
}

export interface FirestoreMessage {
  id: string
  bookingId: string
  senderId: string
  senderType: "family" | "vendor"
  text: string
  timestamp: number
}

export interface FirestoreTypingState {
  bookingId: string
  familyTyping?: boolean
  vendorTyping?: boolean
  updatedAt: number
}
