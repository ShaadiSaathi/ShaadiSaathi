"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import type { ReactNode } from "react"

function LockIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  )
}

export interface SidebarNavItemProps {
  href: string
  label: string
  /** Shorter label for compact mobile bottom nav */
  shortLabel?: string
  icon: ReactNode
  active: boolean
  locked: boolean
  upgradeHref: string
  /** Full label for screen readers when locked */
  lockedAriaLabel: string
  premiumChipLabel?: "Premium" | "Featured"
  variant?: "sidebar" | "bottom"
  /** Unread message count badge */
  badgeCount?: number
}

/** Nav item with optional premium lock — tappable upgrade redirect when locked */
export default function SidebarNavItem({
  href,
  label,
  shortLabel,
  icon,
  active,
  locked,
  upgradeHref,
  lockedAriaLabel,
  premiumChipLabel = "Premium",
  variant = "sidebar",
  badgeCount = 0,
}: SidebarNavItemProps) {
  const router = useRouter()
  const displayLabel = variant === "bottom" && shortLabel ? shortLabel : label

  if (variant === "bottom") {
    if (locked) {
      return (
        <li className="min-w-[4.25rem] shrink-0">
          <button
            type="button"
            onClick={() => router.push(upgradeHref)}
            aria-label={lockedAriaLabel}
            className="flex w-full flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-[10px] font-medium text-maroon/55 transition-colors hover:bg-gold/8 hover:text-maroon/75"
          >
            <span className="relative rounded-lg border border-dashed border-gold/30 bg-gold/5 p-1.5 text-gold-dark/60">
              {icon}
              <LockIcon className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-ivory text-maroon/50" />
            </span>
            <span className="flex items-center gap-0.5 leading-tight">
              {displayLabel}
            </span>
          </button>
        </li>
      )
    }

    return (
      <li className="min-w-[4.25rem] shrink-0">
        <Link
          href={href}
          className={`flex flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-[10px] font-medium transition-colors ${
            active ? "text-maroon" : "text-maroon/50"
          }`}
          aria-current={active ? "page" : undefined}
        >
          <span
            className={`relative rounded-lg p-1.5 ${active ? "bg-maroon text-gold" : "text-gold-dark/70"}`}
          >
            {icon}
            {badgeCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white">
                {badgeCount > 9 ? "9+" : badgeCount}
              </span>
            )}
          </span>
          {displayLabel}
        </Link>
      </li>
    )
  }

  // Desktop sidebar
  if (locked) {
    return (
      <button
        type="button"
        onClick={() => router.push(upgradeHref)}
        aria-label={lockedAriaLabel}
        className="flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left text-sm font-medium text-maroon/55 transition-colors hover:border-gold/20 hover:bg-gold/8 hover:text-maroon/75"
      >
        <span className="text-gold-dark/50">{icon}</span>
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span className="flex shrink-0 items-center gap-1.5">
          <span className="rounded-full border border-gold/30 bg-gold/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-gold-dark">
            {premiumChipLabel}
          </span>
          <LockIcon className="text-maroon/40" />
        </span>
      </button>
    )
  }

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "bg-maroon text-ivory shadow-sm shadow-maroon/20"
          : "text-maroon/70 hover:bg-maroon/5 hover:text-maroon"
      }`}
      aria-current={active ? "page" : undefined}
    >
      <span className={active ? "text-gold" : "text-gold-dark/70"}>{icon}</span>
      <span className="flex flex-1 items-center justify-between gap-2">
        <span>{label}</span>
        {badgeCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[10px] font-bold text-white">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        )}
      </span>
    </Link>
  )
}
