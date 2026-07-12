"use client"

import type { ClinicalReport } from "@/lib/side-profile-report"

const statusColor = {
  normal: "text-success",
  borderline: "text-warning",
  abnormal: "text-error",
} as const

type ClinicalReportCardProps = {
  report: ClinicalReport
  fhpTiltDeg?: number
}

export function ClinicalReportCard({ report, fhpTiltDeg }: ClinicalReportCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-bg/50">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
          Cephalometric Report
        </h2>
        {fhpTiltDeg != null && (
          <p className="text-xs text-text-muted mt-1">
            FHP corrected by {Math.abs(fhpTiltDeg).toFixed(1)}° — all verticals perpendicular to Frankfort plane
          </p>
        )}
      </div>

      <div className="p-5 space-y-6">
        <section>
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
            Angular Measurements
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-muted border-b border-border">
                  <th className="pb-2 pr-4 font-medium">Metric</th>
                  <th className="pb-2 pr-4 font-medium">Value</th>
                  <th className="pb-2 pr-4 font-medium">Norm</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {report.angles.map((row) => (
                  <tr key={row.metric} className="border-b border-border/50">
                    <td className="py-2.5 pr-4 text-text-primary">{row.metric}</td>
                    <td className="py-2.5 pr-4 font-mono font-semibold tabular-nums">
                      {row.value.toFixed(1)}{row.unit}
                    </td>
                    <td className="py-2.5 pr-4 text-text-secondary">{row.norm}</td>
                    <td className={`py-2.5 capitalize font-medium ${statusColor[row.status]}`}>
                      {row.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
            Linear Projections
          </h3>
          <div className="space-y-2">
            {report.linear.map((row) => (
              <div
                key={row.metric}
                className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2 border-b border-border/50 last:border-0"
              >
                <span className="text-text-secondary text-sm">{row.metric}</span>
                <div className="text-right">
                  <span className="text-text-primary font-mono text-sm">{row.value}</span>
                  <p className="text-xs text-text-muted mt-0.5">{row.status}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl bg-bg border border-border p-4 space-y-3">
          <div>
            <p className="text-xs font-semibold text-accent-secondary uppercase tracking-wider mb-1">
              Maxilla (Arnett soft-tissue)
            </p>
            <p className="text-sm text-text-secondary leading-relaxed">{report.maxillaAssessment}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-accent-secondary uppercase tracking-wider mb-1">
              Mandible (Steiner soft-tissue)
            </p>
            <p className="text-sm text-text-secondary leading-relaxed">{report.mandibleAssessment}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
              Clinical Conclusion
            </p>
            <p className="text-sm text-text-primary leading-relaxed">{report.conclusion}</p>
          </div>
        </section>
      </div>
    </div>
  )
}
