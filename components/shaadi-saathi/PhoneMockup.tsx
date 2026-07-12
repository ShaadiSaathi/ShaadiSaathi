/** Stylized phone mockup — replace inner content with real app screenshots later */

const EVENTS = [
  { name: "Mehndi", guests: 142, color: "bg-rose-200" },
  { name: "Baraat", guests: 280, color: "bg-amber-200" },
  { name: "Walima", guests: 310, color: "bg-emerald-200" },
] as const

export default function PhoneMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[280px] sm:max-w-[300px]">
      {/* Mehndi-pattern decorative frame */}
      <div
        className="absolute -inset-3 rounded-[2.5rem] border-2 border-gold/40 sm:-inset-4"
        aria-hidden="true"
      >
        <div className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border border-gold/50 bg-ivory" />
        <div className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border border-gold/50 bg-ivory" />
        <div className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rotate-45 border border-gold/50 bg-ivory" />
        <div className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rotate-45 border border-gold/50 bg-ivory" />
      </div>

      <div className="relative overflow-hidden rounded-[2rem] border-4 border-maroon/20 bg-white shadow-2xl shadow-maroon/15">
        {/* Status bar */}
        <div className="flex items-center justify-between bg-maroon px-4 py-2.5">
          <span className="font-display text-sm font-semibold text-ivory">Shaadi Saathi</span>
          <span className="text-xs text-ivory/70">3 events</span>
        </div>

        {/* App screen — placeholder UI */}
        <div className="space-y-3 bg-ivory p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-maroon/60">
            Guest Overview
          </p>

          {EVENTS.map((event) => (
            <div
              key={event.name}
              className="rounded-xl border border-gold/20 bg-white p-3 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${event.color}`} />
                  <span className="text-sm font-semibold text-maroon-dark">{event.name}</span>
                </div>
                <span className="text-xs text-maroon/60">{event.guests} guests</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-maroon/10">
                <div
                  className="h-full rounded-full bg-gold"
                  style={{ width: `${Math.min(100, (event.guests / 350) * 100)}%` }}
                />
              </div>
            </div>
          ))}

          <div className="rounded-xl border border-dashed border-gold/30 bg-gold/5 p-3 text-center">
            <p className="text-xs text-maroon/70">+ Add guest to multiple events</p>
          </div>
        </div>

        {/* Home indicator */}
        <div className="flex justify-center bg-ivory py-2">
          <div className="h-1 w-16 rounded-full bg-maroon/20" />
        </div>
      </div>

      {/* PLACEHOLDER: swap PhoneMockup inner content with real screenshot:
          <Image src="/images/app-guest-list.png" alt="Guest list screen" fill className="object-cover" />
      */}
    </div>
  )
}
