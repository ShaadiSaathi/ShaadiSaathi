import CTAButton from "./CTAButton"
import MehndiPattern from "./MehndiPattern"
import SectionWrapper from "./SectionWrapper"

interface FinalCTAProps {
  title?: string
  description?: string
  ctaLabel?: string
  ctaHref?: string
}

export default function FinalCTA({
  title = "Your big day deserves a calm plan.",
  description = "Join families who traded the chaos for clarity. Start planning your mehndi, baraat, and walima — free.",
  ctaLabel = "Start Planning Free",
  ctaHref = "/signup",
}: FinalCTAProps) {
  return (
    <SectionWrapper id="cta" className="relative overflow-hidden py-20 sm:py-28">
      <MehndiPattern opacity={0.07} />

      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-maroon/5 via-transparent to-gold/5"
        aria-hidden="true"
      />

      {/* Decorative floral corners */}
      <div className="pointer-events-none absolute left-4 top-4 text-gold/30 sm:left-8 sm:top-8" aria-hidden="true">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <path
            d="M24 4 C28 12, 32 16, 24 24 C16 16, 20 12, 24 4Z"
            stroke="currentColor"
            strokeWidth="1"
          />
          <path
            d="M4 24 C12 28, 16 32, 24 24 C16 16, 12 20, 4 24Z"
            stroke="currentColor"
            strokeWidth="1"
          />
        </svg>
      </div>
      <div className="pointer-events-none absolute bottom-4 right-4 rotate-180 text-gold/30 sm:bottom-8 sm:right-8" aria-hidden="true">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <path
            d="M24 4 C28 12, 32 16, 24 24 C16 16, 20 12, 24 4Z"
            stroke="currentColor"
            strokeWidth="1"
          />
          <path
            d="M4 24 C12 28, 16 32, 24 24 C16 16, 12 20, 4 24Z"
            stroke="currentColor"
            strokeWidth="1"
          />
        </svg>
      </div>

      <div className="relative mx-auto max-w-3xl px-5 text-center sm:px-8">
        <h2 className="font-display text-3xl font-bold text-maroon-dark sm:text-4xl lg:text-5xl">
          {title}
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-maroon/70">
          {description}
        </p>
        <div className="mt-8">
          <CTAButton href={ctaHref} className="text-lg px-10 py-4">
            {ctaLabel}
          </CTAButton>
        </div>
      </div>
    </SectionWrapper>
  )
}
