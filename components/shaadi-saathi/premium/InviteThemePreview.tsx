import type { InviteThemeId } from "@/lib/premium"
import { getInviteTheme } from "@/lib/premium"

interface InviteThemePreviewProps {
  themeId: InviteThemeId
  coupleName?: string
  className?: string
}

/** Mini mock invite card for live theme preview in settings */
export default function InviteThemePreview({
  themeId,
  coupleName = "Ayesha & Bilal",
  className = "",
}: InviteThemePreviewProps) {
  const theme = getInviteTheme(themeId)

  return (
    <div
      className={`overflow-hidden rounded-xl border shadow-sm ${theme.cardBorder} ${className}`}
      aria-hidden="true"
    >
      <div className={`bg-gradient-to-b px-4 py-3 text-center ${theme.motif}`}>
        <p className={`text-[10px] font-medium uppercase tracking-widest ${theme.accent}`}>
          You are cordially invited
        </p>
        <p className={`mt-1 font-display text-sm font-bold ${theme.heading}`}>{coupleName}</p>
      </div>
      <div className={`px-4 py-3 ${theme.bg}`}>
        <div className="rounded-lg border border-gold/20 bg-white/90 px-3 py-2">
          <p className="text-[10px] font-medium text-maroon-dark">Mehndi</p>
          <p className="mt-1 text-[9px] text-maroon/50">Aug 8 · 6:00 PM</p>
          <div className="mt-2 flex gap-1">
            <span className="rounded-md bg-maroon px-2 py-0.5 text-[8px] font-medium text-ivory">
              Accept
            </span>
            <span className="rounded-md border border-maroon/20 px-2 py-0.5 text-[8px] text-maroon/60">
              Decline
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
