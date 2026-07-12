import MehndiPattern from "./MehndiPattern"
import SectionWrapper from "./SectionWrapper"

const FEATURES = [
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
        />
      </svg>
    ),
    title: "Multi-Event Setup",
    description:
      "Organize mehndi, baraat, walima, sangeet, and dholki as separate events — each with its own details.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
        />
      </svg>
    ),
    title: "Guest List Manager",
    description:
      "One master list with tags per event. Add a guest once, invite them to mehndi, baraat, or all three.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    title: "RSVP Tracking",
    description:
      "Live headcounts per event. Know exactly how many plates to order before the caterer calls again.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
        />
      </svg>
    ),
    title: "Task Checklist",
    description:
      "Assign tasks to family members — book venue, order flowers, confirm mehndi artist — and track what's done.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    title: "Shared Schedule",
    description:
      "Everyone sees the same timeline — from dholki night to baraat departure. No more &ldquo;what time is it again?&rdquo;",
  },
] as const

export default function Features() {
  return (
    <SectionWrapper id="features" className="relative overflow-hidden py-16 sm:py-24">
      <MehndiPattern opacity={0.04} className="opacity-60" />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-maroon-dark sm:text-4xl">
            Everything your family needs
          </h2>
          <p className="mt-4 text-lg text-maroon/70">
            Five tools that replace the group chats, spreadsheets, and sticky notes.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <SectionWrapper
              key={feature.title}
              delay={i * 0.08}
              className={`group rounded-2xl border border-gold/30 bg-white/90 p-6 shadow-sm backdrop-blur-sm transition-all hover:border-gold/50 hover:shadow-md ${
                i === 4 ? "sm:col-span-2 lg:col-span-1" : ""
              }`}
            >
              <div className="mb-4 inline-flex rounded-xl border border-gold/20 bg-gold/10 p-3 text-gold-dark transition-colors group-hover:bg-gold/15">
                {feature.icon}
              </div>
              <h3 className="font-display text-xl font-semibold text-maroon-dark">
                {feature.title}
              </h3>
              <p className="mt-2 leading-relaxed text-maroon/70">{feature.description}</p>
            </SectionWrapper>
          ))}
        </div>
      </div>
    </SectionWrapper>
  )
}
