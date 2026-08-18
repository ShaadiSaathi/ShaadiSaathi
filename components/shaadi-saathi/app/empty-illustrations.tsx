import type { ReactNode } from "react"

type IllustrationProps = { className?: string }

const stroke = {
  maroon: "#6A1B4D",
  gold: "#B8860B",
}

function Frame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 160 120"
      className={`h-28 w-auto text-maroon ${className}`}
      fill="none"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

/** Three guests under a Mughal arch */
export function EmptyGuestsIllustration({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <path d="M28 98 H132" stroke={stroke.gold} strokeWidth="1.2" />
      <path
        d="M40 98 V52 C40 28 80 18 80 18 C80 18 120 28 120 52 V98"
        stroke={stroke.maroon}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M52 52 H108" stroke={stroke.gold} strokeWidth="1" opacity="0.7" />
      <circle cx="58" cy="68" r="7" stroke={stroke.maroon} strokeWidth="1.3" />
      <path d="M46 90 C46 80 70 80 70 90" stroke={stroke.maroon} strokeWidth="1.3" />
      <circle cx="80" cy="64" r="8" stroke={stroke.gold} strokeWidth="1.4" />
      <path d="M64 90 C64 76 96 76 96 90" stroke={stroke.gold} strokeWidth="1.4" />
      <circle cx="102" cy="68" r="7" stroke={stroke.maroon} strokeWidth="1.3" />
      <path d="M90 90 C90 80 114 80 114 90" stroke={stroke.maroon} strokeWidth="1.3" />
    </Frame>
  )
}

/** Jharokha shopfront — vendors */
export function EmptyVendorsIllustration({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <rect x="38" y="36" width="84" height="62" rx="4" stroke={stroke.maroon} strokeWidth="1.4" />
      <path d="M38 52 H122" stroke={stroke.gold} strokeWidth="1.2" />
      <path d="M80 22 C80 22 118 30 118 52 H42 C42 30 80 22 80 22Z" stroke={stroke.maroon} strokeWidth="1.4" />
      <path d="M62 68 V98" stroke={stroke.maroon} strokeWidth="1.2" />
      <path d="M98 68 V98" stroke={stroke.maroon} strokeWidth="1.2" />
      <circle cx="80" cy="74" r="8" stroke={stroke.gold} strokeWidth="1.3" />
      <path d="M74 74 H86" stroke={stroke.gold} strokeWidth="1" />
    </Frame>
  )
}

/** Checklist with paisley flourish */
export function EmptyTasksIllustration({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <rect x="42" y="24" width="76" height="80" rx="6" stroke={stroke.maroon} strokeWidth="1.4" />
      <path d="M56 48 H104" stroke={stroke.gold} strokeWidth="1.2" />
      <path d="M56 66 H96" stroke={stroke.maroon} strokeWidth="1.2" opacity="0.7" />
      <path d="M56 84 H88" stroke={stroke.maroon} strokeWidth="1.2" opacity="0.5" />
      <path
        d="M54 46 l6 6 12-14"
        stroke={stroke.gold}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M118 40 C130 28 142 52 126 62 C140 70 128 92 116 80 C108 92 96 70 110 62 C96 54 106 30 118 40Z"
        stroke={stroke.gold}
        strokeWidth="1.1"
        opacity="0.85"
      />
    </Frame>
  )
}

/** Booking envelope under an arch */
export function EmptyBookingsIllustration({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <path
        d="M36 96 V50 C36 28 80 16 80 16 C80 16 124 28 124 50 V96"
        stroke={stroke.maroon}
        strokeWidth="1.4"
      />
      <rect x="50" y="52" width="60" height="38" rx="3" stroke={stroke.gold} strokeWidth="1.4" />
      <path d="M50 56 L80 74 L110 56" stroke={stroke.gold} strokeWidth="1.3" />
    </Frame>
  )
}

/** Star in a lotus-like arch — reviews */
export function EmptyReviewsIllustration({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <path
        d="M40 96 C40 56 80 22 80 22 C80 22 120 56 120 96"
        stroke={stroke.maroon}
        strokeWidth="1.4"
      />
      <path
        d="M80 44 l6.5 13.2 14.5 2.1-10.5 10.2 2.5 14.4L80 76.8 67 83.9l2.5-14.4-10.5-10.2 14.5-2.1Z"
        stroke={stroke.gold}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M48 96 H112" stroke={stroke.gold} strokeWidth="1.1" />
    </Frame>
  )
}

/** Speech bubble with paisley — chat history */
export function EmptyChatIllustration({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <path
        d="M34 36 H110 C122 36 128 42 128 52 V70 C128 80 122 86 110 86 H72 L52 102 V86 H46 C36 86 32 80 32 70 V52 C32 42 36 36 46 36Z"
        stroke={stroke.maroon}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M52 56 H108" stroke={stroke.gold} strokeWidth="1.2" />
      <path d="M52 68 H92" stroke={stroke.gold} strokeWidth="1.2" opacity="0.7" />
    </Frame>
  )
}
