import Link from "next/link"

interface SidebarUpgradeCTAProps {
  portal: "family" | "vendor"
  isUpgraded: boolean
  /** Compact strip for mobile above bottom nav */
  compact?: boolean
}

/** Bottom-of-sidebar upgrade prompt or quiet active-tier indicator */
export default function SidebarUpgradeCTA({
  portal,
  isUpgraded,
  compact = false,
}: SidebarUpgradeCTAProps) {
  if (isUpgraded) {
    return (
      <div
        className={`flex items-center justify-center gap-2 rounded-xl border border-gold/25 bg-gold/8 text-gold-dark ${
          compact ? "mx-2 mb-1 px-3 py-2 text-xs font-medium" : "px-3 py-2.5 text-sm font-medium"
        }`}
        role="status"
      >
        <span aria-hidden="true">✓</span>
        {portal === "family" ? "Premium ✓" : "Featured ✓"}
      </div>
    )
  }

  const href = portal === "family" ? "/upgrade" : "/vendor/upgrade"
  const label =
    portal === "family" ? "✨ Upgrade to Premium" : "⭐ Become a Featured Vendor"

  return (
    <Link
      href={href}
      className={`block rounded-xl border border-gold/35 bg-gradient-to-r from-gold/15 to-gold/5 font-medium text-maroon-dark transition-shadow hover:shadow-sm ${
        compact
          ? "mx-2 mb-1 px-3 py-2 text-center text-xs"
          : "px-3 py-2.5 text-center text-sm"
      }`}
    >
      {label}
    </Link>
  )
}
