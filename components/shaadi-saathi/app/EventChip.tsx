import type { EventId } from "@/lib/mockData"
import { EVENTS } from "@/lib/mockData"

interface EventChipProps {
  eventId: EventId
  size?: "sm" | "md"
}

export default function EventChip({ eventId, size = "sm" }: EventChipProps) {
  const event = EVENTS.find((e) => e.id === eventId)
  if (!event) return null

  const sizeClass = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"

  return (
    <span
      className={`inline-flex rounded-full font-medium ${event.chipColor} ${sizeClass}`}
    >
      {event.name}
    </span>
  )
}
