import type { PlanRow } from "@/lib/premium"

interface PlanComparisonTableProps {
  freeLabel?: string
  premiumLabel?: string
  rows: PlanRow[]
  premiumColumnTitle?: string
}

/** Reusable Free vs Premium comparison — table on desktop, stacked cards on mobile */
export default function PlanComparisonTable({
  freeLabel = "Free",
  premiumLabel = "Premium",
  rows,
  premiumColumnTitle = premiumLabel,
}: PlanComparisonTableProps) {
  return (
    <>
      {/* Mobile: stacked cards */}
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <div
            key={row.label}
            className={`rounded-2xl border border-gold/20 bg-white p-4 shadow-sm ${
              row.highlight ? "ring-1 ring-gold/30" : ""
            }`}
          >
            <p className="font-display font-semibold text-maroon-dark">{row.label}</p>
            <dl className="mt-3 grid gap-2 text-sm">
              <div className="flex justify-between gap-3 rounded-lg bg-ivory/60 px-3 py-2">
                <dt className="text-maroon/50">{freeLabel}</dt>
                <dd className="text-right font-medium text-maroon/70">{row.free}</dd>
              </div>
              <div className="flex justify-between gap-3 rounded-lg bg-gold/10 px-3 py-2">
                <dt className="font-medium text-maroon-dark">{premiumColumnTitle}</dt>
                <dd className="text-right font-semibold text-maroon-dark">{row.premium}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-hidden rounded-2xl border border-gold/20 bg-white shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">
            Comparison of {freeLabel} and {premiumColumnTitle} plans
          </caption>
          <thead>
            <tr className="border-b border-gold/15 bg-ivory/50">
              <th scope="col" className="px-4 py-3 font-medium text-maroon/50">
                Feature
              </th>
              <th scope="col" className="px-4 py-3 font-medium text-maroon/70">
                {freeLabel}
              </th>
              <th
                scope="col"
                className="bg-gold/10 px-4 py-3 font-display font-semibold text-maroon-dark"
              >
                {premiumColumnTitle}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.label}
                className={`border-b border-gold/10 last:border-0 ${
                  row.highlight ? "bg-gold/5" : ""
                }`}
              >
                <th scope="row" className="px-4 py-3 font-medium text-maroon-dark">
                  {row.label}
                </th>
                <td className="px-4 py-3 text-maroon/60">{row.free}</td>
                <td className="bg-gold/5 px-4 py-3 font-medium text-maroon-dark">
                  {row.premium}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
