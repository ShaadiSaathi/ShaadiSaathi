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
import type { VendorVerificationStatus } from "./vendor-verification"

export type { VendorVerificationStatus }

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
  /** Epoch ms — scheduled vendor arrival for grace/no-show automation */
  scheduledArrivalAt?: number
  /** Epoch ms — arrival + grace hours; past this without check-in → no-show */
  gracePeriodEndsAt?: number
  balanceMarkedPaidAt?: number
  balanceChargedAt?: number
  refundAmount?: number
  refundConfirmedAt?: number
  /** Set when automation (or admin) declares a no-show */
  noShowDeclaredAt?: number
  noShowAutoDeclared?: boolean
  currency: string
  stripeDepositPaymentIntentId?: string
  stripeBalancePaymentIntentId?: string
  safepayPayoutToken?: string
  safepayPayoutStatus?: SafepayPayoutStatus
  safepayPayoutRequestId?: string
  safepayPayoutAttemptedAt?: number
  safepayPayoutError?: string
  updatedAt: number
}

export interface FirestoreUser {
  uid: string
  role: UserRole
  phone: string
  name: string
  /** Optional contact email for receipts / booking updates — never used for login */
  email?: string
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
  /**
   * IANA timezone for schedule/RSVP lock math. Absent → Asia/Karachi.
   * Weddings do not historically store this; default is documented in rsvp-lock.ts.
   */
  timezone?: string
  /** Additive per-event date/time/RSVP-lock overrides (core events stay mock-seeded). */
  eventOverrides?: Partial<
    Record<
      EventId,
      {
        date?: string
        time?: string
        rsvpLockHoursBefore?: number | null
      }
    >
  >
}

export type TaskStatusValue = "todo" | "in_progress" | "done"

export type CollaboratorInviteStatus = "pending" | "accepted" | "declined" | "cancelled"

/** Phone invite for a real family collaborator (grants app access, not guest RSVP). */
export interface FirestoreCollaboratorInvite {
  id: string
  weddingId: string
  /** E.164 phone the invitee must sign up / log in with */
  phone: string
  invitedByUid: string
  invitedByName: string
  weddingName: string
  status: CollaboratorInviteStatus
  createdAt: number
  acceptedAt?: number
  acceptedByUid?: string
}

export interface FirestoreTask {
  id: string
  weddingId: string
  title: string
  /** Display name of the person responsible */
  assignee: string
  /** Firebase Auth UID when assigned to a real wedding member */
  assigneeUid?: string
  dueDate: string
  status: TaskStatusValue
  eventId?: EventId
  priority?: "low" | "medium" | "high"
  createdAt: number
}

export type NotificationType =
  | "task_assigned"
  | "task_due_soon"
  | "booking_request"
  | "quote_received"
  | "quote_accepted"
  | "quote_rejected"
  | "extra_work_needed"
  | "dispute_raised"
  | "dispute_vendor_response"
  | "dispute_auto_resolved"
  | "no_show_declared"

export type NotificationPriority = "normal" | "urgent"

/** In-app inbox item — recipient-scoped; not push/FCM. */
export interface FirestoreNotification {
  id: string
  recipientUid: string
  /** Wedding context when applicable (always set for current product events) */
  weddingId: string
  type: NotificationType
  message: string
  read: boolean
  createdAt: number
  /** Related task (assignment / due-soon) */
  taskId?: string
  /** Related booking (quotes, disputes, extra work, requests) */
  bookingId?: string
  /** Deep link inside the app (family or vendor path) */
  href?: string
  /** urgent = Extra Work Needed and similar time-sensitive alerts */
  priority?: NotificationPriority
  /** Who triggered the notification (e.g. assigner) */
  actorUid?: string
  /** Denormalized display name so recipients need no users/{uid} read */
  actorName?: string
}

export interface FirestoreBookingCounterOffer {
  price: number
  packageName?: string
  note?: string
  proposedAt: number
  proposedBy: "vendor" | "family"
}

export interface FirestoreExtraWorkRequest {
  description: string
  estimatedAmount?: number
  status: "pending" | "approved" | "rejected"
  requestedAt: number
  requestedByUid: string
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
  /** Optional household invite — absent means individual */
  kind?: "individual" | "group"
  /** Headcount for group invites */
  partySize?: number
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
  /** Optional contact email (also stored on users/{ownerUid}.email) */
  email?: string
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
  /** Identity check for payments — defaults to unverified on signup */
  verificationStatus?: VendorVerificationStatus
  /** Submitted CNIC / national ID number (text only — no document upload yet) */
  verificationCnic?: string
  verificationBusinessName?: string
  verificationCity?: string
  verificationSubmittedAt?: number
  verificationReviewedAt?: number
  verificationRejectionReason?: string
}

export interface FirestoreBookingDispute {
  status: "under_review" | "resolved"
  category?: DisputeCategory
  description: string
  submittedAt: number
  /** Epoch ms — vendor must respond before this or dispute auto-resolves for family */
  vendorResponseDeadlineAt?: number
  disputedAmount?: number
  familyReason?: string
  vendorResponse?: string
  evidenceFileName?: string
  resolution?: "family" | "vendor" | "split"
  splitFamilyAmount?: number
  splitVendorAmount?: number
  resolvedAt?: number
  resolvedByUid?: string
  /** True when Cloud Function / cron resolved without admin or vendor action */
  autoResolved?: boolean
  autoResolvedReason?: string
}

export interface FirestoreBooking {
  id: string
  weddingId: string
  vendorId: string
  eventId: EventId
  /**
   * Calendar date (YYYY-MM-DD) for the wedding event this booking covers.
   * Required for platform-wide conflict checks across families.
   */
  eventDate?: string
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
  counterOffer?: FirestoreBookingCounterOffer
  extraWorkRequest?: FirestoreExtraWorkRequest
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
