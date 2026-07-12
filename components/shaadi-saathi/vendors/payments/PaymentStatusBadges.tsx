import type { BookingPayment, DepositStatus, BalanceStatus } from "@/lib/mockPayments"
import {
  DEPOSIT_STATUS_STYLES,
  BALANCE_STATUS_STYLES,
  getDepositStatusLabel,
  getBalanceStatusLabel,
} from "@/lib/mockPayments"

export function DepositStatusBadge({ status }: { status: DepositStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${DEPOSIT_STATUS_STYLES[status]}`}
    >
      Deposit: {getDepositStatusLabel(status)}
    </span>
  )
}

export function BalanceStatusBadge({ payment }: { payment: BookingPayment }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${BALANCE_STATUS_STYLES[payment.balanceStatus]}`}
    >
      Balance: {getBalanceStatusLabel(payment.balanceStatus, payment)}
    </span>
  )
}

export function PaymentPathBadge({ payment }: { payment: BookingPayment }) {
  const label =
    payment.paymentPath === "online"
      ? "Online balance"
      : payment.inPersonMethod === "card"
        ? "In person · Card"
        : "In person · Cash"

  return (
    <span className="inline-flex rounded-full border border-gold/25 bg-gold/8 px-2 py-0.5 text-[10px] font-medium text-maroon/70">
      {label}
    </span>
  )
}

export function NoShowBadge() {
  return (
    <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-800">
      No-show
    </span>
  )
}

export function DisputeBadge() {
  return (
    <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
      Dispute under review
    </span>
  )
}
