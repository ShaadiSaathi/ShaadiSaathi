"use client"

import Link from "next/link"
import type { ReactNode } from "react"

interface BookingStatusCardProps {
  title: string
  subtitle?: string
  price?: string
  badges?: ReactNode
  children?: ReactNode
  href?: string
  icon?: ReactNode
}

/** Shared booking/job card shell — family bookings & vendor jobs */
export default function BookingStatusCard({
  title,
  subtitle,
  price,
  badges,
  children,
  href,
  icon,
}: BookingStatusCardProps) {
  const inner = (
  <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {icon && (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold-dark">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-medium text-maroon-dark">{title}</p>
            {subtitle && <p className="text-xs text-maroon/50">{subtitle}</p>}
          </div>
        </div>
        {price && <p className="text-sm font-semibold text-maroon-dark">{price}</p>}
      </div>
      {badges && <div className="mt-3 flex flex-wrap gap-2">{badges}</div>}
      {children && <div className="mt-4 space-y-3 border-t border-gold/10 pt-4">{children}</div>}
  </>
  )

  const className =
    "block rounded-2xl border border-gold/15 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    )
  }

  return <article className={className}>{inner}</article>
}
