"use client"

interface AuthSubmitButtonProps {
  children: React.ReactNode
  loading?: boolean
  disabled?: boolean
  variant?: "primary" | "ghost"
}

export default function AuthSubmitButton({
  children,
  loading = false,
  disabled = false,
  variant = "primary",
}: AuthSubmitButtonProps) {
  const base =
    "inline-flex w-full items-center justify-center gap-2 rounded-full px-8 py-3.5 text-base font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon disabled:cursor-not-allowed disabled:opacity-60"

  const styles =
    variant === "primary"
      ? "bg-gold text-maroon-dark shadow-md shadow-gold/25 hover:shadow-lg hover:shadow-gold/35"
      : "border border-maroon/20 text-maroon hover:bg-maroon/5"

  return (
    <button type="submit" disabled={disabled || loading} className={`${base} ${styles}`}>
      {loading && (
        <svg
          className="h-4 w-4 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {loading ? "Please wait…" : children}
    </button>
  )
}
