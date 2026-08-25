/**
 * Branded wedding-plan PDF — maroon / gold / ivory Shaadi Saathi visual language.
 * Server-only via @react-pdf/renderer (no browser print dialog).
 */

import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer"
import type { WeddingPlanExportSnapshot } from "@/lib/wedding-plan-export/types"
import {
  formatExportDate,
  formatPkr,
} from "@/lib/wedding-plan-export/format"

const IVORY = "#FDF6ED"
const MAROON = "#6A1B4D"
const MAROON_DARK = "#4A1235"
const GOLD = "#B8860B"
const GOLD_DARK = "#8B6508"
const MUTED = "#8A5A72"
const RULE = "#B8860B55"

Font.register({
  family: "PlayfairDisplay",
  fonts: [
    {
      src: "https://cdn.jsdelivr.net/fontsource/fonts/playfair-display@5.2.5/latin-400-normal.ttf",
      fontWeight: 400,
    },
    {
      src: "https://cdn.jsdelivr.net/fontsource/fonts/playfair-display@5.2.5/latin-600-normal.ttf",
      fontWeight: 600,
    },
    {
      src: "https://cdn.jsdelivr.net/fontsource/fonts/playfair-display@5.2.5/latin-700-normal.ttf",
      fontWeight: 700,
    },
  ],
})

Font.register({
  family: "DMSans",
  fonts: [
    {
      src: "https://cdn.jsdelivr.net/fontsource/fonts/dm-sans@5.2.5/latin-400-normal.ttf",
      fontWeight: 400,
    },
    {
      src: "https://cdn.jsdelivr.net/fontsource/fonts/dm-sans@5.2.5/latin-500-normal.ttf",
      fontWeight: 500,
    },
    {
      src: "https://cdn.jsdelivr.net/fontsource/fonts/dm-sans@5.2.5/latin-700-normal.ttf",
      fontWeight: 700,
    },
  ],
})

// Avoid default hyphenation dictionary import issues under some Node resolvers.
Font.registerHyphenationCallback((word) => [word])

const styles = StyleSheet.create({
  page: {
    backgroundColor: IVORY,
    color: MAROON_DARK,
    fontFamily: "DMSans",
    fontSize: 10,
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
  },
  coverPage: {
    backgroundColor: IVORY,
    color: MAROON_DARK,
    fontFamily: "DMSans",
    paddingTop: 72,
    paddingBottom: 56,
    paddingHorizontal: 56,
    justifyContent: "space-between",
  },
  goldRule: {
    height: 1.5,
    backgroundColor: GOLD,
    width: "100%",
  },
  thinRule: {
    height: 1,
    backgroundColor: RULE,
    width: "100%",
    marginVertical: 14,
  },
  brand: {
    fontFamily: "PlayfairDisplay",
    fontSize: 14,
    fontWeight: 600,
    color: GOLD_DARK,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  coverTitle: {
    fontFamily: "PlayfairDisplay",
    fontSize: 36,
    fontWeight: 700,
    color: MAROON_DARK,
    lineHeight: 1.2,
    marginTop: 28,
  },
  coverSubtitle: {
    fontFamily: "DMSans",
    fontSize: 12,
    color: MUTED,
    marginTop: 14,
    lineHeight: 1.5,
  },
  coverMeta: {
    marginTop: 36,
    gap: 6,
  },
  coverMetaLine: {
    fontSize: 11,
    color: MAROON,
  },
  decorativeBar: {
    height: 8,
    backgroundColor: MAROON,
    width: 72,
    marginTop: 24,
    marginBottom: 8,
  },
  decorativeGold: {
    height: 3,
    backgroundColor: GOLD,
    width: 120,
  },
  sectionTitle: {
    fontFamily: "PlayfairDisplay",
    fontSize: 16,
    fontWeight: 600,
    color: MAROON_DARK,
    marginBottom: 8,
  },
  sectionLead: {
    fontSize: 9,
    color: MUTED,
    marginBottom: 12,
  },
  label: {
    fontSize: 8,
    fontWeight: 500,
    color: GOLD_DARK,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  body: {
    fontSize: 10,
    lineHeight: 1.45,
    color: MAROON_DARK,
  },
  muted: {
    color: MUTED,
  },
  row: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 10,
  },
  col: {
    flexGrow: 1,
    flexBasis: 0,
  },
  card: {
    borderWidth: 1,
    borderColor: RULE,
    borderRadius: 4,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#FFFBF5",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: GOLD,
    paddingBottom: 6,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: RULE,
  },
  th: {
    fontSize: 8,
    fontWeight: 700,
    color: GOLD_DARK,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  td: {
    fontSize: 9,
    color: MAROON_DARK,
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 8,
    color: MUTED,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  chip: {
    borderWidth: 1,
    borderColor: RULE,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 8,
    color: MAROON,
  },
  statGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  stat: {
    flexGrow: 1,
    flexBasis: 0,
    backgroundColor: "#FFFBF5",
    borderWidth: 1,
    borderColor: RULE,
    borderRadius: 4,
    padding: 10,
  },
  statValue: {
    fontFamily: "PlayfairDisplay",
    fontSize: 18,
    fontWeight: 600,
    color: MAROON_DARK,
  },
  statLabel: {
    fontSize: 8,
    color: MUTED,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
})

function PageFooter({
  snapshot,
  pageLabel,
}: {
  snapshot: WeddingPlanExportSnapshot
  pageLabel: string
}) {
  const exported = new Date(snapshot.exportedAtIso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>
        Shaadi Saathi · Exported on {exported}
      </Text>
      <Text style={styles.footerText}>{pageLabel}</Text>
    </View>
  )
}

function SectionHeading({
  title,
  lead,
}: {
  title: string
  lead?: string
}) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.goldRule} />
      {lead ? <Text style={styles.sectionLead}>{lead}</Text> : <View style={{ height: 10 }} />}
    </View>
  )
}

function statusLabel(status: string): string {
  return status.replace(/_/g, " ")
}

export function WeddingPlanPdfDocument({
  snapshot,
}: {
  snapshot: WeddingPlanExportSnapshot
}) {
  return (
    <Document
      title={`${snapshot.couple} — Wedding Plan`}
      author="Shaadi Saathi"
      subject="Wedding plan export"
      creator="Shaadi Saathi"
    >
      {/* Cover */}
      <Page size="A4" style={styles.coverPage}>
        <View>
          <Text style={styles.brand}>Shaadi Saathi</Text>
          <View style={styles.decorativeBar} />
          <View style={styles.decorativeGold} />
          <Text style={styles.coverTitle}>{snapshot.couple}</Text>
          <Text style={styles.coverSubtitle}>Wedding planning overview</Text>
          <View style={styles.coverMeta}>
            {snapshot.firstEventDate ? (
              <Text style={styles.coverMetaLine}>
                First celebration · {formatExportDate(snapshot.firstEventDate)}
              </Text>
            ) : null}
            <Text style={styles.coverMetaLine}>
              Organised by {snapshot.organiserName}
            </Text>
            <Text style={styles.coverMetaLine}>
              Prepared for {snapshot.exportedByName}
            </Text>
          </View>
          <View style={styles.chipRow}>
            {snapshot.plannedEventLabels.map((label) => (
              <Text key={label} style={styles.chip}>
                {label}
              </Text>
            ))}
          </View>
        </View>
        <View>
          <View style={styles.thinRule} />
          <Text style={[styles.body, styles.muted]}>
            A snapshot of your Shaadi Saathi wedding plan. Figures and guest
            responses reflect the moment of export and are not live.
          </Text>
        </View>
        <PageFooter snapshot={snapshot} pageLabel="Cover" />
      </Page>

      {/* Overview + events */}
      <Page size="A4" style={styles.page}>
        <SectionHeading
          title="Wedding overview"
          lead="Celebrations, venues, and timing for your multi-event wedding."
        />
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Family / wedding</Text>
            <Text style={styles.body}>{snapshot.weddingName}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Couple</Text>
            <Text style={styles.body}>{snapshot.couple}</Text>
          </View>
        </View>
        {snapshot.budgetTierLabel ? (
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.label}>Budget preference</Text>
            <Text style={styles.body}>{snapshot.budgetTierLabel}</Text>
          </View>
        ) : null}

        {snapshot.events.map((event) => (
          <View key={String(event.id)} style={styles.card} wrap={false}>
            <Text
              style={{
                fontFamily: "PlayfairDisplay",
                fontSize: 13,
                fontWeight: 600,
                color: MAROON_DARK,
                marginBottom: 6,
              }}
            >
              {event.name}
            </Text>
            <Text style={styles.body}>
              {formatExportDate(event.date)} · {event.time}
            </Text>
            <Text style={[styles.body, { marginTop: 4 }]}>
              {event.venue}
            </Text>
            <Text style={[styles.body, styles.muted, { marginTop: 2 }]}>
              {event.address}
            </Text>
            {snapshot.includeFinancials && typeof event.budgetTarget === "number" ? (
              <Text style={[styles.body, { marginTop: 6 }]}>
                Budget target · {formatPkr(event.budgetTarget)}
              </Text>
            ) : null}
          </View>
        ))}
        <PageFooter snapshot={snapshot} pageLabel="Overview" />
      </Page>

      {/* Guests */}
      <Page size="A4" style={styles.page}>
        <SectionHeading
          title="Guest list"
          lead="Household invites and RSVP headcount across events."
        />
        <View style={styles.statGrid}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{snapshot.guestStats.households}</Text>
            <Text style={styles.statLabel}>Invites</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{snapshot.guestStats.headcount}</Text>
            <Text style={styles.statLabel}>Headcount</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{snapshot.guestStats.confirmed}</Text>
            <Text style={styles.statLabel}>Confirmed</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{snapshot.guestStats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{snapshot.guestStats.declined}</Text>
            <Text style={styles.statLabel}>Declined</Text>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.th, { width: "28%" }]}>Guest</Text>
          <Text style={[styles.th, { width: "22%" }]}>Events</Text>
          <Text style={[styles.th, { width: "40%" }]}>RSVP</Text>
          <Text style={[styles.th, { width: "10%" }]}>Size</Text>
        </View>
        {snapshot.guests.length === 0 ? (
          <Text style={[styles.body, styles.muted]}>No guests added yet.</Text>
        ) : (
          snapshot.guests.map((g, i) => (
            <View key={`${g.name}-${i}`} style={styles.tableRow} wrap={false}>
              <Text style={[styles.td, { width: "28%" }]}>
                {g.name}
                {g.kind === "group" ? " (group)" : ""}
              </Text>
              <Text style={[styles.td, { width: "22%" }]}>{g.events || "—"}</Text>
              <Text style={[styles.td, { width: "40%" }]}>{g.rsvpSummary}</Text>
              <Text style={[styles.td, { width: "10%" }]}>{g.partySize}</Text>
            </View>
          ))
        )}
        <PageFooter snapshot={snapshot} pageLabel="Guests" />
      </Page>

      {/* Vendors */}
      <Page size="A4" style={styles.page}>
        <SectionHeading
          title="Vendor bookings"
          lead={
            snapshot.includeFinancials
              ? "Booked vendors, status, and amounts at export time."
              : "Booked vendors and status (amounts hidden for this collaborator)."
          }
        />
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { width: "24%" }]}>Vendor</Text>
          <Text style={[styles.th, { width: "18%" }]}>Service</Text>
          <Text style={[styles.th, { width: "16%" }]}>Event</Text>
          <Text style={[styles.th, { width: "14%" }]}>Status</Text>
          <Text style={[styles.th, { width: "14%" }]}>Date</Text>
          {snapshot.includeFinancials ? (
            <Text style={[styles.th, { width: "14%" }]}>Amount</Text>
          ) : null}
        </View>
        {snapshot.bookings.length === 0 ? (
          <Text style={[styles.body, styles.muted]}>No vendor bookings yet.</Text>
        ) : (
          snapshot.bookings.map((b, i) => (
            <View key={`${b.vendorName}-${i}`} style={styles.tableRow} wrap={false}>
              <Text style={[styles.td, { width: "24%" }]}>{b.vendorName}</Text>
              <Text style={[styles.td, { width: "18%" }]}>{b.service}</Text>
              <Text style={[styles.td, { width: "16%" }]}>{b.eventName}</Text>
              <Text style={[styles.td, { width: "14%" }]}>
                {statusLabel(String(b.status))}
              </Text>
              <Text style={[styles.td, { width: "14%" }]}>{b.eventDate}</Text>
              {snapshot.includeFinancials ? (
                <Text style={[styles.td, { width: "14%" }]}>
                  {typeof b.amountPkr === "number" ? formatPkr(b.amountPkr) : "—"}
                </Text>
              ) : null}
            </View>
          ))
        )}
        <PageFooter snapshot={snapshot} pageLabel="Vendors" />
      </Page>

      {/* Tasks */}
      <Page size="A4" style={styles.page}>
        <SectionHeading
          title="Tasks"
          lead="Current planning checklist and completion status."
        />
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { width: "40%" }]}>Task</Text>
          <Text style={[styles.th, { width: "20%" }]}>Assignee</Text>
          <Text style={[styles.th, { width: "18%" }]}>Due</Text>
          <Text style={[styles.th, { width: "22%" }]}>Status</Text>
        </View>
        {snapshot.tasks.length === 0 ? (
          <Text style={[styles.body, styles.muted]}>No tasks yet.</Text>
        ) : (
          snapshot.tasks.map((t, i) => (
            <View key={`${t.title}-${i}`} style={styles.tableRow} wrap={false}>
              <Text style={[styles.td, { width: "40%" }]}>
                {t.title}
                {t.eventName ? ` · ${t.eventName}` : ""}
              </Text>
              <Text style={[styles.td, { width: "20%" }]}>{t.assignee}</Text>
              <Text style={[styles.td, { width: "18%" }]}>
                {t.dueDate ? formatExportDate(t.dueDate) : "—"}
              </Text>
              <Text style={[styles.td, { width: "22%" }]}>
                {statusLabel(String(t.status))}
              </Text>
            </View>
          ))
        )}
        <PageFooter snapshot={snapshot} pageLabel="Tasks" />
      </Page>

      {/* Schedule */}
      <Page size="A4" style={styles.page}>
        <SectionHeading
          title="Schedule"
          lead="Day-of run-of-show timelines where they have been set."
        />
        {snapshot.events.every((e) => e.schedule.length === 0) ? (
          <Text style={[styles.body, styles.muted]}>
            No day-of timelines have been added yet. Event dates and venues are
            listed on the overview page.
          </Text>
        ) : (
          snapshot.events
            .filter((e) => e.schedule.length > 0)
            .map((event) => (
              <View key={`sched-${event.id}`} style={styles.card} wrap={false}>
                <Text
                  style={{
                    fontFamily: "PlayfairDisplay",
                    fontSize: 12,
                    fontWeight: 600,
                    marginBottom: 8,
                    color: MAROON_DARK,
                  }}
                >
                  {event.name} · {formatExportDate(event.date)}
                </Text>
                {event.schedule.map((row, idx) => (
                  <View
                    key={`${event.id}-${idx}`}
                    style={{ flexDirection: "row", marginBottom: 4 }}
                  >
                    <Text style={[styles.td, { width: "22%", color: GOLD_DARK }]}>
                      {row.time}
                    </Text>
                    <Text style={[styles.td, { width: "78%" }]}>{row.label}</Text>
                  </View>
                ))}
              </View>
            ))
        )}
        <PageFooter snapshot={snapshot} pageLabel="Schedule" />
      </Page>

      {/* Budget — financial only */}
      {snapshot.includeFinancials ? (
        <Page size="A4" style={styles.page}>
          <SectionHeading
            title="Budget summary"
            lead="Per-event targets versus booked vendor spend."
          />
          {snapshot.budgetByEvent.length === 0 ? (
            <Text style={[styles.body, styles.muted]}>
              No budget targets available for this wedding yet.
            </Text>
          ) : (
            <>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { width: "34%" }]}>Event</Text>
                <Text style={[styles.th, { width: "33%" }]}>Target</Text>
                <Text style={[styles.th, { width: "33%" }]}>Booked spend</Text>
              </View>
              {snapshot.budgetByEvent.map((row) => (
                <View key={row.eventName} style={styles.tableRow} wrap={false}>
                  <Text style={[styles.td, { width: "34%" }]}>{row.eventName}</Text>
                  <Text style={[styles.td, { width: "33%" }]}>
                    {formatPkr(row.targetPkr)}
                  </Text>
                  <Text style={[styles.td, { width: "33%" }]}>
                    {formatPkr(row.bookedSpendPkr)}
                  </Text>
                </View>
              ))}
              <View style={[styles.thinRule, { marginTop: 16 }]} />
              <Text style={[styles.body, styles.muted]}>
                Booked spend sums confirmed booking prices. It does not include
                unpaid quotes or off-platform costs.
              </Text>
            </>
          )}
          <PageFooter snapshot={snapshot} pageLabel="Budget" />
        </Page>
      ) : null}
    </Document>
  )
}
