import type { EventId, RsvpSource, RsvpStatus } from "@/lib/mockData"
import type { InviteThemeId } from "@/lib/premium"
import type { BookingStatus, VendorCategoryId } from "@/lib/mockVendors"
import type {
  BalanceStatus,
  DepositStatus,
  DisputeCategory,
  InPersonMethod,
  PaymentPath,
} from "@/lib/mockPayments"

export type UserRole = "family" | "vendor"

export type SafepayPayoutStatus =
  | "P_INITIATED"
  | "P_RECEIVED"
  | "P_FAILED"
  | "P_REJECTED"
  | "P_SETTLED"

/**
 * Persisted payment snapshot on Firestore bookings. Defined here (rather than
 * imported from lib/payments) so the core Firestore types never depend on the
 * optional payments subsystem — that module is not always present/enabled and
 * a stray import breaks the production build with module_not_found.
 */
export type FirestoreBookingPayment = {
  totalPrice: number
  depositAmount: number
  depositPercent: number
  balanceAmount: number
  paymentPath: PaymentPath
  inPersonMethod?: InPersonMethod
  depositStatus: DepositStatus
  balanceStatus: BalanceStatus
  depositPaidAt?: number
  checkInAt?: number
  balanceMarkedPaidAt?: number
  balanceChargedAt?: number
  refundAmount?: number
  refundConfirmedAt?: number
  currency: string
  stripeDepositPaymentIntentId?: string
  stripeBalancePaymentIntentId?: string
  safepayPayoutToken?: string
  safepayPayoutStatus?: SafepayPayoutStatus
  safepayPayoutRequestId?: string
  updatedAt: number
}

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

export interface FirestoreVendorPackage {
  name: string
  price: number
  perHead?: boolean
  description: string
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
  /** Optional listing fields — filled later in vendor profile */
  startingPrice?: number
  coverGradient?: string
  galleryGradients?: string[]
  coverPhotoUrl?: string
  photoUrls?: string[]
  packages?: FirestoreVendorPackage[]
  availableFor?: EventId[]
  emergencyAvailable?: boolean
  reliabilityScore?: number
  noShowCount?: number
  suspended?: boolean
  acceptsCardInPerson?: boolean
  completedJobsCount?: number
  featuredBoost?: number
  rating?: number
  reviewCount?: number
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
