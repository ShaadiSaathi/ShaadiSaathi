import type { EventId, RsvpSource, RsvpStatus } from "@/lib/mockData"
import type { InviteThemeId } from "@/lib/premium"
import type { BookingStatus, VendorCategoryId } from "@/lib/mockVendors"
import type { DisputeCategory } from "@/lib/mockPayments"
import type { PaymentPath } from "@/lib/mockPayments"
import type { FirestoreBookingPayment } from "@/lib/payments/types"

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
  /** Per-event last RSVP change (ms) */
  rsvpUpdatedAt?: Partial<Record<EventId, number | null>>
  /** Guest changed an existing response — organiser "Updated" cue */
  rsvpOrganiserAlert?: Partial<Record<EventId, boolean>>
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

export interface FirestoreBookingDispute {
  status: "under_review" | "resolved"
  category?: DisputeCategory
  description: string
  submittedAt: number
  disputedAmount?: number
  familyReason?: string
  vendorResponse?: string
  evidenceFileName?: string
  resolution?: "family" | "vendor" | "split"
  splitFamilyAmount?: number
  splitVendorAmount?: number
  resolvedAt?: number
  resolvedByUid?: string
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
  /** Persisted deposit/balance lifecycle (Stripe + Safepay) */
  payment?: FirestoreBookingPayment
  createdByUid?: string
  updatedAt?: number
  dispute?: FirestoreBookingDispute
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
