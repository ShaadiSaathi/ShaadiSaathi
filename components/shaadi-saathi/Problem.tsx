import SectionWrapper from "./SectionWrapper"

const PAIN_POINTS = [
  {
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
        />
      </svg>
    ),
    title: "Guest lists scattered across chats",
    description:
      "Auntie forwarded a list on WhatsApp. Chachi sent a voice note. Someone has a notebook somewhere. Sound familiar?",
  },
  {
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
        />
      </svg>
    ),
    title: "No one knows who's invited to what",
    description:
      "Is Uncle Rashid coming to the mehndi or just the walima? Three people asked. Nobody's sure.",
  },
  {
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
        />
      </svg>
    ),
    title: "Tasks fall through the cracks",
    description:
      "Who was supposed to book the dholki? Did anyone confirm the caterer? The shaadi is in two weeks.",
  },
] as const

export default function Problem() {
  return (
    <SectionWrapper id="problem" className="relative py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-maroon-dark sm:text-4xl">
            We&apos;ve all been there
          </h2>
          <p className="mt-4 text-lg text-maroon/70">
            South Asian weddings are beautiful — and beautifully chaotic. Shaadi Saathi was
            built for the aunties, cousins, and siblings who keep everything running.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PAIN_POINTS.map((point, i) => (
            <SectionWrapper
              key={point.title}
              delay={i * 0.1}
              className="rounded-2xl border border-gold/25 bg-white p-6 shadow-sm shadow-maroon/5 transition-shadow hover:shadow-md hover:shadow-maroon/8"
            >
              <div className="mb-4 inline-flex rounded-xl bg-maroon/8 p-3 text-maroon">
                {point.icon}
              </div>
              <h3 className="font-display text-xl font-semibold text-maroon-dark">
                {point.title}
              </h3>
              <p className="mt-2 leading-relaxed text-maroon/70">{point.description}</p>
            </SectionWrapper>
          ))}
        </div>
      </div>
    </SectionWrapper>
  )
}
