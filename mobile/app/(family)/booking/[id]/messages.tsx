import { useLocalSearchParams } from "expo-router"
import { BookingChat } from "@/src/components/BookingChat"
import { EmptyState, Screen } from "@/src/components/ui"

export default function BookingMessagesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const bookingId = typeof id === "string" ? id : id?.[0]

  if (!bookingId) {
    return (
      <Screen>
        <EmptyState
          title="Missing booking"
          body="Open a booking first, then start a conversation."
        />
      </Screen>
    )
  }

  return (
    <BookingChat bookingId={bookingId} subtitle="Booking messages" />
  )
}
