export const WEDDING_EVENTS = [
  {
    id: "mehndi",
    name: "Mehndi",
    defaultTime: "6:00 PM",
    venueHint: "Garden / terrace",
  },
  {
    id: "baraat",
    name: "Baraat",
    defaultTime: "7:00 PM",
    venueHint: "Main hall",
  },
  {
    id: "walima",
    name: "Walima",
    defaultTime: "8:00 PM",
    venueHint: "Reception",
  },
] as const

export type WeddingEventId = (typeof WEDDING_EVENTS)[number]["id"]
