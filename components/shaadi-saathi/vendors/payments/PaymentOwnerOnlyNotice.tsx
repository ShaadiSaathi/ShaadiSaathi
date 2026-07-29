"use client"

/** Calm read-only notice when a collaborator sees a pending payment action. */
export default function PaymentOwnerOnlyNotice({ ownerName }: { ownerName: string }) {
  return (
    <div
      className="rounded-xl border border-gold/20 bg-ivory/80 px-4 py-3 text-sm text-maroon/70"
      role="status"
    >
      Only <span className="font-semibold text-maroon-dark">{ownerName}</span> can approve
      payments for this wedding.
    </div>
  )
}
