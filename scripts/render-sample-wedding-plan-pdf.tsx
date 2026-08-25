/**
 * Local visual check: render a sample wedding-plan PDF without Firebase.
 * Run: npx tsx scripts/render-sample-wedding-plan-pdf.tsx
 */
import { writeFileSync } from "fs"
import { join } from "path"
import { renderToBuffer } from "@react-pdf/renderer"
import { WeddingPlanPdfDocument } from "../lib/wedding-plan-export/WeddingPlanPdf"
import type { WeddingPlanExportSnapshot } from "../lib/wedding-plan-export/types"

const snapshot: WeddingPlanExportSnapshot = {
  weddingName: "Khan Family Wedding",
  couple: "Ayesha & Omar",
  organiserName: "Amina Khan",
  firstEventDate: "2026-10-10",
  plannedEventLabels: ["Mehndi", "Nikah", "Baraat", "Walima"],
  exportedAtIso: new Date().toISOString(),
  exportedByName: "Amina Khan",
  includeFinancials: true,
  events: [
    {
      id: "mehndi",
      name: "Mehndi",
      date: "2026-10-10",
      time: "4:00 PM",
      venue: "Garden Pavilion",
      address: "Lahore",
      budgetTarget: 400000,
      schedule: [
        { time: "14:00", label: "Henna artists arrive" },
        { time: "16:00", label: "Guest seating" },
      ],
    },
    {
      id: "baraat",
      name: "Baraat",
      date: "2026-10-11",
      time: "7:00 PM",
      venue: "Grand Ballroom",
      address: "Lahore",
      budgetTarget: 1200000,
      schedule: [],
    },
    {
      id: "walima",
      name: "Walima",
      date: "2026-10-12",
      time: "1:00 PM",
      venue: "Courtyard Hall",
      address: "Lahore",
      budgetTarget: 900000,
      schedule: [],
    },
  ],
  guestStats: {
    households: 2,
    headcount: 5,
    confirmed: 3,
    declined: 0,
    pending: 2,
  },
  guests: [
    {
      name: "Uncle Bilal",
      events: "Mehndi, Baraat",
      rsvpSummary: "Mehndi: confirmed · Baraat: pending",
      partySize: 1,
      kind: "individual",
    },
    {
      name: "Ahmed Family",
      events: "Walima",
      rsvpSummary: "Walima: confirmed",
      partySize: 4,
      kind: "group",
    },
  ],
  bookings: [
    {
      vendorName: "Golden Lens Studio",
      service: "Mehndi coverage",
      eventName: "Mehndi",
      eventDate: "2026-10-10",
      status: "confirmed",
      amountPkr: 125000,
    },
  ],
  tasks: [
    {
      title: "Confirm mehndi florist",
      assignee: "Amina",
      dueDate: "2026-09-01",
      status: "todo",
      eventName: "Mehndi",
      priority: "high",
    },
  ],
  budgetByEvent: [
    { eventName: "Mehndi", targetPkr: 400000, bookedSpendPkr: 125000 },
    { eventName: "Baraat", targetPkr: 1200000, bookedSpendPkr: 0 },
    { eventName: "Walima", targetPkr: 900000, bookedSpendPkr: 0 },
  ],
  budgetTierLabel: "Mid-range",
}

async function main() {
  const buffer = await renderToBuffer(
    (<WeddingPlanPdfDocument snapshot={snapshot} />) as Parameters<
      typeof renderToBuffer
    >[0]
  )
  const out = join(process.cwd(), ".staging-wedding-plan-sample.pdf")
  writeFileSync(out, buffer)
  console.log(`Wrote ${buffer.length} bytes → ${out}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
