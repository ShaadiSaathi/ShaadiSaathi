/** Jaali (lattice) section divider — decorative, low-opacity */
export default function JaaliDivider() {
  return (
    <div className="relative mx-auto my-4 h-px max-w-4xl overflow-hidden" aria-hidden="true">
      <svg
        className="h-8 w-full"
        viewBox="0 0 800 32"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="jaali" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
            <path
              d="M0 12 H24 M12 0 V24 M0 0 L24 24 M24 0 L0 24"
              stroke="#B8860B"
              strokeWidth="0.5"
              opacity="0.35"
            />
          </pattern>
        </defs>
        <rect width="800" height="32" fill="url(#jaali)" opacity="0.5" />
        <line x1="0" y1="16" x2="800" y2="16" stroke="#B8860B" strokeWidth="0.5" opacity="0.4" />
      </svg>
    </div>
  )
}
