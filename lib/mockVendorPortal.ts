/**
 * Shaadi Saathi — vendor portal mock data.
 * PLACEHOLDER: swap for Convex queries when backend is ready.
 */

import type { EventId } from "./mockData"
import type {
  BalanceStatus,
  BookingPayment,
  DepositStatus,
  PaymentPath,
} from "./mockPayments"
import {
  MOCK_NOW,
  createInitialPayment,
  enrichPaymentWithSchedule,
  getGracePeriodEnd,
  getScheduledArrival,
} from "./mockPayments"

export type VendorRequestStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "awaiting_family_response"
  | "awaiting_vendor_response"
export type VendorJobStatus =
  | "upcoming"
  | "awaiting_check_in"
  | "completed"
  | "no_show_flagged"
  | "disputed"

export interface CounterOffer {
  price: number
  packageName?: string
  note?: string
  proposedAt: string
  proposedBy: "vendor" | "family"
}

export interface FlaggedIncident {
  id: string
  date: string
  description: string
  vendorResponse?: string
}

export interface VendorBusiness {
  id: string
  name: string
  categoryId: string
  categoryLabel: string
  city: string
  phone: string
  email: string
  bio: string
  priceRange: string
  reliabilityScore: number
  onTimeCheckInRate: number
  emergencyAvailable: boolean
  noShowCount: number
  suspended: boolean
  rating: number
  reviewCount: number
  completedJobsCount: number
  flaggedIncidents: FlaggedIncident[]
  subscriptionTier?: "basic" | "featured"
}

export interface BookingRequest {
  id: string
  familyName: string
  weddingName: string
  eventId: EventId
  eventName: string
  eventDate: string
  venue: string
  guestCount?: number
  packageName?: string
  proposedPrice: number
  note?: string
  status: VendorRequestStatus
  receivedAt: string
  paymentPath?: PaymentPath
  counterOffer?: CounterOffer
  negotiationRound?: number
}

export interface VendorJob {
  id: string
  requestId?: string
  familyName: string
  weddingName: string
  familyPhone: string
  eventId: EventId
  eventName: string
  eventDate: string
  eventTime: string
  venue: string
  venueAddress: string
  guestCount?: number
  packageName?: string
  price: number
  jobStatus: VendorJobStatus
  payment: BookingPayment
  disputeFamilyMessage?: string
  disputeVendorResponse?: string
  completedAt?: string
  isRepeatClient?: boolean
}

export interface EarningsTransaction {
  id: string
  jobId: string
  familyName: string
  eventName: string
  amount: number
  type: "deposit" | "balance"
  depositStatus?: DepositStatus
  balanceStatus?: BalanceStatus
  date: string
  label: string
}

export const CURRENT_VENDOR: VendorBusiness = {
  id: "vendor-portal-1",
  name: "Lahore Feast Catering",
  categoryId: "catering",
  categoryLabel: "Catering",
  city: "Lahore",
  phone: "+92 321 555 0198",
  email: "bookings@lahorefeast.pk",
  bio: "Authentic Pakistani cuisine with live BBQ counters, high tea spreads, and elegant walima dinner service. Family-run since 1998.",
  priceRange: "Rs. 80,000 – 700,000",
  reliabilityScore: 98,
  onTimeCheckInRate: 98,
  emergencyAvailable: true,
  noShowCount: 0,
  suspended: false,
  rating: 4.9,
  reviewCount: 124,
  completedJobsCount: 3,
  flaggedIncidents: [],
  subscriptionTier: "basic",
}

export const INITIAL_BOOKING_REQUESTS: BookingRequest[] = [
  {
    id: "req-1",
    familyName: "Ayesha & Bilal",
    weddingName: "Ayesha & Bilal's Wedding",
    eventId: "mehndi",
    eventName: "Mehndi",
    eventDate: "2026-08-08",
    venue: "Garden Terrace, Pearl Continental",
    guestCount: 142,
    packageName: "Mehndi High Tea",
    proposedPrice: 170400,
    note: "Need vegetarian options for ~15 guests",
    status: "pending",
    receivedAt: "2026-07-10",
    paymentPath: "in_person",
  },
  {
    id: "req-2",
    familyName: "Fatima & Hassan",
    weddingName: "Fatima & Hassan's Walima",
    eventId: "walima",
    eventName: "Walima",
    eventDate: "2026-08-15",
    venue: "Royal Orchid Banquet",
    guestCount: 220,
    packageName: "Gold",
    proposedPrice: 550000,
    note: "Live BBQ counter requested",
    status: "pending",
    receivedAt: "2026-07-09",
    paymentPath: "online",
  },
]

function makeJobPayment(price: number, path: PaymentPath, eventId: EventId, overrides?: Partial<BookingPayment>): BookingPayment {
  return enrichPaymentWithSchedule(
    {
      ...createInitialPayment(price, path, path === "in_person" ? "cash" : undefined),
      ...overrides,
    },
    eventId
  )
}

export const INITIAL_VENDOR_JOBS: VendorJob[] = [
  {
    id: "job-1",
    requestId: "req-old-1",
    familyName: "Ayesha & Bilal",
    weddingName: "Ayesha & Bilal's Wedding",
    familyPhone: "+92 300 ••• ••42",
    eventId: "walima",
    eventName: "Walima",
    eventDate: "2026-08-12",
    eventTime: "7:30 PM",
    venue: "Royal Orchid Banquet",
    venueAddress: "DHA Phase 5, Lahore",
    guestCount: 280,
    packageName: "Gold",
    price: 700000,
    jobStatus: "upcoming",
    payment: makeJobPayment(700000, "in_person", "walima", {
      depositStatus: "held",
      balanceStatus: "due_in_person",
      messages: [
        { id: "vj1", sender: "family", text: "Please confirm vegetarian count by Aug 1.", sentAt: "2026-07-05T10:00:00.000Z" },
        { id: "vj2", sender: "vendor", text: "Noted — we'll prepare 25 veg portions.", sentAt: "2026-07-05T14:00:00.000Z" },
      ],
    }),
    isRepeatClient: true,
  },
  {
    id: "job-2",
    familyName: "Sana & Omar",
    weddingName: "Sana & Omar's Wedding",
    familyPhone: "+92 333 ••• ••18",
    eventId: "baraat",
    eventName: "Baraat",
    eventDate: "2026-07-11",
    eventTime: "11:00 AM",
    venue: "Grand Ballroom, Avari Hotel",
    venueAddress: "Egerton Road, Lahore",
    guestCount: 180,
    packageName: "Silver",
    price: 324000,
    jobStatus: "awaiting_check_in",
    payment: {
      ...makeJobPayment(324000, "online", "baraat"),
      scheduledArrivalAt: "2026-07-11T06:00:00.000Z",
      gracePeriodEndsAt: "2026-07-11T08:00:00.000Z",
      depositStatus: "held",
      balanceStatus: "pending_online",
    },
  },
  {
    id: "job-3",
    familyName: "Priya & Rajesh",
    weddingName: "Priya & Rajesh's Mehndi",
    familyPhone: "+92 345 ••• ••77",
    eventId: "mehndi",
    eventName: "Mehndi",
    eventDate: "2026-06-28",
    eventTime: "6:00 PM",
    venue: "Private Residence, Gulberg",
    venueAddress: "Gulberg III, Lahore",
    guestCount: 95,
    packageName: "Mehndi High Tea",
    price: 114000,
    jobStatus: "completed",
    payment: makeJobPayment(114000, "in_person", "mehndi", {
      depositStatus: "released",
      balanceStatus: "paid_in_person",
      checkInAt: "2026-06-28T12:30:00.000Z",
      checkInStatus: "confirmed",
      checkInPhoto: {
        name: "mehndi-spread.jpg",
        previewUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect fill='%23fdf6ed' width='200' height='150'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%236A1B4D' font-size='11'%3EHigh tea setup%3C/text%3E%3C/svg%3E",
        uploadedAt: "2026-06-28T12:30:00.000Z",
      },
      balanceMarkedPaidAt: "2026-06-28T18:00:00.000Z",
      messages: [
        { id: "vj3", sender: "vendor", text: "Setup complete — high tea is ready!", sentAt: "2026-06-28T12:35:00.000Z" },
      ],
    }),
    completedAt: "2026-06-28",
  },
  {
    id: "job-4",
    familyName: "Hina & Tariq",
    weddingName: "Hina & Tariq's Walima",
    familyPhone: "+92 312 ••• ••55",
    eventId: "walima",
    eventName: "Walima",
    eventDate: "2026-07-05",
    eventTime: "7:30 PM",
    venue: "Pearl Continental",
    venueAddress: "Shahrah-e-Quaid-e-Azam, Lahore",
    guestCount: 200,
    packageName: "Gold",
    price: 500000,
    jobStatus: "disputed",
    payment: makeJobPayment(500000, "online", "walima", {
      depositStatus: "released",
      balanceStatus: "charged_pending_release",
      checkInAt: "2026-07-05T14:00:00.000Z",
      balanceChargedAt: "2026-07-05T14:00:00.000Z",
      dispute: {
        status: "under_review",
        category: "quality",
        description: "Several dishes were cold when served. Guest count was higher than quoted portions.",
        submittedAt: "2026-07-06T10:00:00.000Z",
      },
    }),
    disputeFamilyMessage:
      "Several dishes were cold when served. Guest count was higher than quoted portions.",
  },
]

export function buildEarningsFromJobs(jobs: VendorJob[]): EarningsTransaction[] {
  const txs: EarningsTransaction[] = []
  for (const job of jobs) {
    const p = job.payment
    txs.push({
      id: `tx-${job.id}-dep`,
      jobId: job.id,
      familyName: job.familyName,
      eventName: job.eventName,
      amount: p.depositAmount,
      type: "deposit",
      depositStatus: p.depositStatus,
      date: p.depositPaidAt?.slice(0, 10) ?? job.eventDate,
      label: `Deposit — ${job.familyName}`,
    })
    if (p.balanceStatus !== "pending_online" || p.balanceChargedAt) {
      txs.push({
        id: `tx-${job.id}-bal`,
        jobId: job.id,
        familyName: job.familyName,
        eventName: job.eventName,
        amount: p.balanceAmount,
        type: "balance",
        balanceStatus: p.balanceStatus,
        date: p.balanceChargedAt?.slice(0, 10) ?? job.eventDate,
        label: `Balance — ${job.familyName}`,
      })
    }
  }
  return txs.sort((a, b) => b.date.localeCompare(a.date))
}

export function getMonthlyEarnings(jobs: VendorJob[], month = "2026-07"): number {
  return jobs
    .filter((j) => j.jobStatus === "completed" && j.completedAt?.startsWith(month))
    .reduce((sum, j) => sum + j.payment.depositAmount + (j.payment.balanceStatus === "paid_in_person" || j.payment.balanceStatus === "released_online" ? j.payment.balanceAmount : 0), 0)
}

export function getPendingPayouts(jobs: VendorJob[]): number {
  return jobs.reduce((sum, j) => {
    const p = j.payment
    let held = 0
    if (p.depositStatus === "held") held += p.depositAmount
    if (p.balanceStatus === "charged_pending_release") held += p.balanceAmount
    return sum + held
  }, 0)
}

export function isNewVendor(completedJobsCount: number): boolean {
  return completedJobsCount < 5
}

export function isRepeatClient(familyName: string, jobs: VendorJob[], excludeId?: string): boolean {
  return jobs.filter((j) => j.familyName === familyName && j.id !== excludeId).length > 0
}

export function getJobById(id: string, jobs: VendorJob[]): VendorJob | undefined {
  return jobs.find((j) => j.id === id)
}

export function requestToJob(req: BookingRequest): VendorJob {
  const payment = enrichPaymentWithSchedule(
    createInitialPayment(
      req.proposedPrice,
      req.paymentPath ?? "in_person",
      req.paymentPath === "in_person" ? "cash" : undefined
    ),
    req.eventId
  )
  return {
    id: `job-${Date.now()}`,
    requestId: req.id,
    familyName: req.familyName,
    weddingName: req.weddingName,
    familyPhone: "+92 3XX ••• ••00",
    eventId: req.eventId,
    eventName: req.eventName,
    eventDate: req.eventDate,
    eventTime: req.eventId === "baraat" ? "11:00 AM" : req.eventId === "mehndi" ? "6:00 PM" : "7:30 PM",
    venue: req.venue,
    venueAddress: req.venue,
    guestCount: req.guestCount,
    packageName: req.packageName,
    price: req.proposedPrice,
    jobStatus: "upcoming",
    payment,
  }
}
