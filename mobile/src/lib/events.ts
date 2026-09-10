export const WEDDING_EVENTS = [
  {
    id: "mehndi" as const,
    name: "Mehndi",
    defaultTime: "6:00 PM",
    venueHint: "Garden / terrace",
    description: "Henna night with music, family, and festive color.",
  },
  {
    id: "baraat" as const,
    name: "Baraat",
    defaultTime: "7:00 PM",
    venueHint: "Main hall",
    description: "Groom's procession and the main wedding ceremony.",
  },
  {
    id: "walima" as const,
    name: "Walima",
    defaultTime: "8:00 PM",
    venueHint: "Reception",
    description: "Reception dinner hosted by the groom's family.",
  },
]

export type WeddingEventId = (typeof WEDDING_EVENTS)[number]["id"]

export function eventLabel(id: string | undefined): string {
  if (!id) return "Event"
  return WEDDING_EVENTS.find((e) => e.id === id)?.name ?? id
}
