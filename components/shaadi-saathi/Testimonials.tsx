import JaaliDivider from "./JaaliDivider"
import SectionWrapper from "./SectionWrapper"

const TESTIMONIALS = [
  {
    quote:
      "We had four WhatsApp groups and two Excel sheets. Shaadi Saathi saved our sanity — and my mother's voice notes.",
    name: "Ayesha & Family",
    location: "Lahore",
  },
  {
    quote:
      "Finally, everyone knew who was invited to the mehndi vs. the walima. The RSVP count alone was worth it.",
    name: "Priya & Rajesh",
    location: "Mumbai",
  },
  {
    quote:
      "My cousins in London and Toronto could see the same schedule. No more 3 AM calls asking what time baraat leaves.",
    name: "Fatima & Hassan",
    location: "Dhaka",
  },
] as const

const TRUST_INDICATORS = [
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
        />
      </svg>
    ),
    text: "Your data stays private to your family",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z"
        />
      </svg>
    ),
    text: "Works even with patchy internet",
  },
] as const

export default function Testimonials() {
  return (
    <SectionWrapper id="testimonials" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-maroon-dark sm:text-4xl">
            Families who found their calm
          </h2>
          <p className="mt-4 text-lg text-maroon/70">
            {/* PLACEHOLDER: replace with real testimonials when available */}
            Real stories from families planning their shaadi.
          </p>
        </div>

        <JaaliDivider />

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <SectionWrapper
              key={t.name}
              delay={i * 0.1}
              className="relative rounded-2xl border border-gold/35 bg-white p-6 shadow-sm"
            >
              {/* Gold foil corner accents */}
              <div
                className="absolute left-3 top-3 h-6 w-6 border-l-2 border-t-2 border-gold/50"
                aria-hidden="true"
              />
              <div
                className="absolute bottom-3 right-3 h-6 w-6 border-b-2 border-r-2 border-gold/50"
                aria-hidden="true"
              />

              <blockquote className="relative">
                <p className="font-display text-lg italic leading-relaxed text-maroon-dark">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <footer className="mt-5 border-t border-gold/20 pt-4">
                  <cite className="not-italic">
                    <span className="block font-semibold text-maroon">{t.name}</span>
                    <span className="text-sm text-maroon/60">{t.location}</span>
                  </cite>
                </footer>
              </blockquote>
            </SectionWrapper>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-10">
          {TRUST_INDICATORS.map((indicator) => (
            <div
              key={indicator.text}
              className="flex items-center gap-2.5 text-sm font-medium text-maroon/80"
            >
              <span className="text-gold-dark">{indicator.icon}</span>
              {indicator.text}
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  )
}
