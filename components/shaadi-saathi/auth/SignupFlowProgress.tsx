interface SignupFlowProgressProps {
  step: number
  total?: number
}

/** Clear step indicator for family signup — functional, not decorative */
export default function SignupFlowProgress({ step, total = 4 }: SignupFlowProgressProps) {
  const clamped = Math.min(Math.max(step, 1), total)

  return (
    <nav aria-label="Signup progress" className="mb-6">
      <ol className="flex items-center gap-1.5">
        {Array.from({ length: total }, (_, i) => {
          const n = i + 1
          const complete = n < clamped
          const active = n === clamped
          return (
            <li key={n} className="flex flex-1 items-center">
              <span
                className={`block h-1 w-full rounded-full transition-[background-color,opacity,transform] duration-200 ${
                  complete || active ? "bg-gold" : "bg-maroon/12"
                } ${active ? "scale-y-125 opacity-100" : complete ? "opacity-90" : "opacity-100"}`}
                aria-hidden
              />
              <span className="sr-only">
                Step {n}
                {complete ? ", complete" : active ? ", current" : ", upcoming"}
              </span>
            </li>
          )
        })}
      </ol>
      <p className="mt-2 text-xs font-medium tracking-wide text-maroon/45">
        Step {clamped} of {total}
      </p>
    </nav>
  )
}
