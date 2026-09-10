import { useLocalSearchParams } from "expo-router"
import { BookingChat } from "@/src/components/BookingChat"
import { EmptyState, Screen } from "@/src/components/ui"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { spacing } from "@/src/lib/theme"

export default function VendorJobMessagesScreen() {
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ id: string }>()
  const bookingId = typeof params.id === "string" ? params.id : params.id?.[0]

  if (!bookingId) {
    return (
      <Screen style={{ paddingTop: insets.top + spacing.md }}>
        <EmptyState
          title="Missing booking"
          body="Open a job first, then start messaging the family."
        />
      </Screen>
    )
  }

  return (
    <BookingChat bookingId={bookingId} subtitle="Chat with the family" />
  )
}
