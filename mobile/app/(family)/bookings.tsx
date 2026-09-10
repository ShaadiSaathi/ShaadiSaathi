import { FlatList, Pressable, StyleSheet, Text } from "react-native"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  BrandTitle,
  Card,
  EmptyState,
  ErrorText,
  LoadingBlock,
  Screen,
} from "@/src/components/ui"
import { useWedding } from "@/src/context/WeddingContext"
import { useBookings } from "@/src/hooks/useWeddingData"
import { eventLabel } from "@/src/lib/events"
import { colors, spacing } from "@/src/lib/theme"

function formatPkr(amount: number) {
  return `Rs ${amount.toLocaleString("en-PK")}`
}

export default function BookingsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { weddingId } = useWedding()
  const { bookings, loading, error } = useBookings(weddingId)

  return (
    <Screen style={{ paddingTop: insets.top + spacing.md }}>
      <BrandTitle subtitle="Vendor bookings for this wedding" />
      <ErrorText message={error} />
      {loading ? (
        <LoadingBlock />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          ListEmptyComponent={
            <EmptyState
              title="No bookings yet"
              body="Browse vendors from More → Vendors to request a booking."
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/(family)/booking/${item.id}`)}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Card>
                <Text style={styles.title}>{item.vendorName}</Text>
                <Text style={styles.meta}>
                  {item.status}
                  {item.eventId ? ` · ${eventLabel(String(item.eventId))}` : ""}
                  {item.eventDate ? ` · ${item.eventDate}` : ""}
                </Text>
                <Text style={styles.price}>
                  {formatPkr(item.price)}
                  {item.packageName ? ` · ${item.packageName}` : ""}
                </Text>
                {item.note ? <Text style={styles.note}>{item.note}</Text> : null}
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },
  title: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
    color: colors.ink,
  },
  meta: {
    marginTop: 4,
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: colors.muted,
    textTransform: "capitalize",
  },
  price: {
    marginTop: 8,
    fontFamily: "DMSans_500Medium",
    fontSize: 15,
    color: colors.maroon,
  },
  note: {
    marginTop: 6,
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: colors.muted,
  },
})
