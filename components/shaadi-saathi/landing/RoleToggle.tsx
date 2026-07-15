"use client"

export type LandingRole = "family" | "vendor"

interface RoleToggleProps {
  role: LandingRole
  onRoleChange: (role: LandingRole) => void
  className?: string
}

/** Family vs vendor entry point — positioned above hero headline */
export default function RoleToggle({ role, onRoleChange, className = "" }: RoleToggleProps) {
  return (
    <div
      className={`inline-flex rounded-full border border-gold/25 bg-white p-1 shadow-sm ${className}`}
      role="tablist"
      aria-label="Choose your role"
    >
      <button
        type="button"
        role="tab"
        aria-selected={role === "family"}
        onClick={() => onRoleChange("family")}
        className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition-colors sm:px-5 max-sm:min-h-[44px] ${
          role === "family"
            ? "bg-maroon text-ivory shadow-sm"
            : "text-maroon/60 hover:text-maroon"
        }`}
      >
        I&apos;m Planning a Wedding
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={role === "vendor"}
        onClick={() => onRoleChange("vendor")}
        className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition-colors sm:px-5 max-sm:min-h-[44px] ${
          role === "vendor"
            ? "bg-maroon text-ivory shadow-sm"
            : "text-maroon/60 hover:text-maroon"
        }`}
      >
        I&apos;m a Vendor
      </button>
    </div>
  )
}
