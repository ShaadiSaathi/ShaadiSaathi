import SectionWrapper from "./SectionWrapper"

const STEPS = [
  {
    number: "01",
    title: "Create your wedding",
    description:
      "Set up your events — mehndi, baraat, walima, and more. Add dates, venues, and who's helping plan.",
    illustration: (
      <div className="flex h-32 items-center justify-center rounded-xl bg-gradient-to-br from-maroon/10 to-gold/10 p-4">
        <div className="space-y-2 text-center">
          <div className="mx-auto h-8 w-8 rounded-lg bg-maroon/20" />
          <div className="mx-auto h-2 w-20 rounded bg-maroon/15" />
          <div className="mx-auto h-2 w-16 rounded bg-gold/20" />
          <p className="text-[10px] text-maroon/50">
            {"/* PLACEHOLDER: event setup screenshot */"}
          </p>
        </div>
      </div>
    ),
  },
  {
    number: "02",
    title: "Build your guest list",
    description:
      "Import or add guests once. Tag them for each event — no duplicate lists, no confusion.",
    illustration: (
      <div className="flex h-32 items-center justify-center rounded-xl bg-gradient-to-br from-gold/10 to-maroon/10 p-4">
        <div className="flex -space-x-2">
          {["A", "R", "S", "F"].map((initial) => (
            <div
              key={initial}
              className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-maroon/15 text-xs font-bold text-maroon"
            >
              {initial}
            </div>
          ))}
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-gold/30 text-xs font-bold text-maroon">
            +42
          </div>
        </div>
      </div>
    ),
  },
  {
    number: "03",
    title: "Invite your family",
    description:
      "Share a link with parents, siblings, and cousins. Everyone can view, RSVP, and check off tasks.",
    illustration: (
      <div className="flex h-32 items-center justify-center rounded-xl bg-gradient-to-br from-maroon/10 to-gold/10 p-4">
        <div className="rounded-lg border border-gold/30 bg-white px-4 py-2 shadow-sm">
          <p className="text-xs font-medium text-maroon">shaadisaathi.app/ahmed-wedding</p>
          <p className="mt-1 text-[10px] text-maroon/50">Share with family →</p>
        </div>
      </div>
    ),
  },
  {
    number: "04",
    title: "Plan with confidence",
    description:
      "Track RSVPs, assign tasks, and follow the schedule — all in one calm, organized space.",
    illustration: (
      <div className="flex h-32 items-center justify-center rounded-xl bg-gradient-to-br from-gold/10 to-maroon/10 p-4">
        <div className="space-y-1.5">
          {["Mehndi ✓", "Baraat ✓", "Walima →"].map((item) => (
            <div
              key={item}
              className="flex items-center gap-2 rounded-md bg-white/80 px-3 py-1 text-xs font-medium text-maroon"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              {item}
            </div>
          ))}
        </div>
      </div>
    ),
  },
] as const

export default function HowItWorks() {
  return (
    <SectionWrapper id="how-it-works" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-maroon-dark sm:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-lg text-maroon/70">
            From first guest list to final headcount — four simple steps.
          </p>
        </div>

        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:gap-10">
          {STEPS.map((step, i) => (
            <SectionWrapper key={step.number} delay={i * 0.1}>
              <div className="flex gap-5">
                <div className="flex-shrink-0">
                  <span className="font-display text-3xl font-bold text-gold/60">{step.number}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-xl font-semibold text-maroon-dark">
                    {step.title}
                  </h3>
                  <p className="mt-2 leading-relaxed text-maroon/70">{step.description}</p>
                  <div className="mt-4">{step.illustration}</div>
                </div>
              </div>
            </SectionWrapper>
          ))}
        </div>
      </div>
    </SectionWrapper>
  )
}
