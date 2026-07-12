import SectionWrapper from "../SectionWrapper"

const BENEFITS = [
  {
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
    title: "Steady bookings from real families",
    description:
      "Families planning mehndi, baraat, and walima find you through a curated directory — no cold DMs or scattered referrals.",
  },
  {
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: "Deposits held securely before the event",
    description:
      "Every booking requires a deposit paid through the app. Your time is protected before you load the van.",
  },
  {
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
    title: "No-show and dispute protection for you too",
    description:
      "Check-in confirms your arrival. Clear records for balances, disputes, and reliability — fair for vendors who show up.",
  },
] as const

export default function VendorBenefits() {
  return (
    <SectionWrapper id="for-vendors" className="relative py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-maroon-dark sm:text-4xl">
            For vendors
          </h2>
          <p className="mt-4 text-lg text-maroon/70">
            Whether you cater walimas or play the dhol — manage bookings, get paid, and build
            your reputation on Shaadi Saathi.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {BENEFITS.map((b, i) => (
            <SectionWrapper
              key={b.title}
              delay={i * 0.1}
              className="rounded-2xl border border-gold/25 bg-white p-6 shadow-sm"
            >
              <div className="mb-4 inline-flex rounded-xl bg-maroon/8 p-3 text-maroon">
                {b.icon}
              </div>
              <h3 className="font-display text-xl font-semibold text-maroon-dark">{b.title}</h3>
              <p className="mt-2 leading-relaxed text-maroon/70">{b.description}</p>
            </SectionWrapper>
          ))}
        </div>
      </div>
    </SectionWrapper>
  )
}
