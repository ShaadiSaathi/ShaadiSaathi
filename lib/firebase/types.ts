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
import type { VendorOnboardingStatus } from "./vendor-onboarding"
import type { VendorPortfolioItem } from "./vendor-portfolio"
import type { VendorVerificationStatus } from "./vendor-verification"

export type { VendorOnboardingStatus, VendorPortfolioItem, VendorVerificationStatus }

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
  /**
   * Optional denormalized vendor earnings bucket (owed/pending/paid/…).
   * Prefer deriving from deposit/balance/safepay fields; may be written by Admin
   * later for querying. Amounts always come from depositAmount/balanceAmount.
   */
  payoutStatus?:
    | "owed"
    | "pending"
    | "paid"
    | "on_hold"
    | "refunded"
    | "none"
  updatedAt: number
}

export interface FirestoreUser {
  uid: string
  role: UserRole
  phone: string
  name: string
  /** Optional contact email for receipts / dispute updates — never used for login */
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
  /**
   * Collaborator UIDs granted elevated financial permission (pay/book/dispute).
   * Owner always has access implicitly — do not require ownerId in this list.
   * Default / absent = collaborators cannot initiate financial actions.
   */
  paymentApproverUids?: string[]
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
  | "booking_message"
  | "vendor_inquiry_message"
  | "family_consult_message"
  | "vendor_verification_approved"
  | "vendor_verification_rejected"

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
  /** Related vendor (pre-booking inquiry / family consult) */
  vendorId?: string
  /** Related chat thread (inquiry / consult) */
  threadId?: string
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
  /** Opaque UUID v4; also the Firestore document id. */
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
  /** Optional listing fields — filled later in vendor profile / onboarding */
  startingPrice?: number
  /** Free-text pricing structure (packages, per-head, etc.) */
  pricingNotes?: string
  coverGradient?: string
  galleryGradients?: string[]
  coverPhotoUrl?: string
  /** Portfolio images from guided onboarding (also used as directory gallery) */
  photoUrls?: string[]
  /**
   * Past-work gallery with optional captions and event tags.
   * Prefer this over photoUrls when present; photoUrls is kept in sync.
   */
  portfolioItems?: VendorPortfolioItem[]
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
  /**
   * Guided signup progress. Independent of payment KYC fields but kept in sync
   * with verificationStatus on submit / admin review.
   */
  onboardingStatus?: VendorOnboardingStatus
  /** Last completed wizard step (1–4) while drafting */
  onboardingStep?: number
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

/**
 * One review per completed/past booking. Document id == bookingId.
 * Aggregates are denormalized onto vendors/{vendorId}.rating + reviewCount.
 */
export interface FirestoreVendorReview {
  id: string
  bookingId: string
  vendorId: string
  weddingId: string
  /** Family member who left the review */
  authorUid: string
  /** Display name — family organiser / wedding name convention */
  familyName: string
  weddingName?: string
  eventId: EventId
  eventDate?: string
  /** 1–5 stars */
  rating: number
  /** Optional written comment */
  comment?: string
  createdAt: number
  updatedAt: number
  /** Optional single public vendor reply */
  vendorReply?: string
  vendorReplyAt?: number
  vendorReplyByUid?: string
}

export type ChatThreadType = "vendor_inquiry" | "family_consult"

/** Pre-booking vendor chat or family-only consult about a vendor. */
export interface FirestoreChatThread {
  id: string
  type: ChatThreadType
  /** Family uid that opened the thread — used so vendors can notify without reading the wedding doc. */
  createdByUid?: string
  weddingId: string
  vendorId: string
  vendorName: string
  createdAt: number
  updatedAt: number
  lastMessageAt?: number
  lastMessagePreview?: string
}

export interface FirestoreMessage {
  id: string
  /** Booking-scoped chat (family ↔ vendor after request/confirm). */
  bookingId?: string
  /** Thread-scoped chat (inquiry / family consult). */
  threadId?: string
  senderId: string
  senderType: "family" | "vendor"
  senderName?: string
  text: string
  imageUrl?: string
  timestamp: number
}

export interface FirestoreTypingState {
  bookingId?: string
  threadId?: string
  familyTyping?: boolean
  vendorTyping?: boolean
  updatedAt: number
}
