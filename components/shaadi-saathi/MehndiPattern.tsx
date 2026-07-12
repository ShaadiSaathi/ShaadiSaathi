interface MehndiPatternProps {
  className?: string
  opacity?: number
}

/** Low-opacity mehndi-inspired SVG texture — swap or replace with custom asset later */
export default function MehndiPattern({
  className = "",
  opacity = 0.06,
}: MehndiPatternProps) {
  return (
    <svg
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern
          id="mehndi-pattern"
          x="0"
          y="0"
          width="120"
          height="120"
          patternUnits="userSpaceOnUse"
        >
          <g fill="none" stroke="#6A1B4D" strokeWidth="0.8" opacity={opacity}>
            <path d="M60 10 C70 25, 75 35, 60 50 C45 35, 50 25, 60 10Z" />
            <path d="M30 60 C40 70, 50 75, 60 60 C50 45, 40 50, 30 60Z" />
            <path d="M90 60 C80 70, 70 75, 60 60 C70 45, 80 50, 90 60Z" />
            <path d="M60 70 C65 85, 70 95, 60 110 C50 95, 55 85, 60 70Z" />
            <circle cx="60" cy="60" r="4" />
            <path d="M10 30 Q30 20, 50 30 Q30 40, 10 30" />
            <path d="M110 90 Q90 80, 70 90 Q90 100, 110 90" />
            <path d="M20 100 Q35 85, 50 100" />
            <path d="M100 20 Q85 35, 70 20" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#mehndi-pattern)" />
    </svg>
  )
}
