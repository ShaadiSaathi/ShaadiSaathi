import Link from "next/link"
import GoldButton from "@/components/shaadi-saathi/app/GoldButton"

interface UpgradePromptBannerProps {
  message: string
  upgradeHref?: string
  onDismiss?: () => void
}

/** Warm, non-punishing upgrade prompt when a free-tier limit is reached */
export default function UpgradePromptBanner({
  message,
  upgradeHref = "/upgrade",
  onDismiss,
}: UpgradePromptBannerProps) {
  return (
    <div
      className="rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/10 via-ivory to-white p-5 shadow-sm"
      role="status"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/20 text-gold-dark"
            aria-hidden="true"
          >
            ✨
          </span>
          <div>
            <p className="font-medium text-maroon-dark">You&apos;ve reached the Free plan limit</p>
            <p className="mt-0.5 text-sm text-maroon/60">{message}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link href={upgradeHref}>
            <GoldButton type="button">View Premium</GoldButton>
          </Link>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-full px-4 py-2 text-sm text-maroon/50 hover:text-maroon"
            >
              Not now
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
