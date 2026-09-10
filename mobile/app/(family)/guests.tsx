import { FlatList, StyleSheet, Text } from "react-native"
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
import { useGuests } from "@/src/hooks/useWeddingData"
import { colors, spacing } from "@/src/lib/theme"

export default function GuestsScreen() {
  const insets = useSafeAreaInsets()
  const { weddingId } = useWedding()
  const { guests, loading, error } = useGuests(weddingId)

  return (
    <Screen style={{ paddingTop: insets.top + spacing.md }}>
      <BrandTitle subtitle={`${guests.length} on the list`} />
      <ErrorText message={error} />
      {loading ? (
        <LoadingBlock />
      ) : (
        <FlatList
          data={guests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          ListEmptyComponent={
            <EmptyState
              title="No guests yet"
              body="Add guests on the web app or invite them with a share link."
            />
          }
          renderItem={({ item }) => {
            const statuses = Object.values(item.rsvp)
            const yes = statuses.filter((s) => s === "yes").length
            return (
              <Card>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>{item.phone || "No phone"}</Text>
                <Text style={styles.meta}>
                  {item.events.length} event{item.events.length === 1 ? "" : "s"}
                  {statuses.length ? ` · ${yes} yes` : ""}
                </Text>
              </Card>
            )
          }}
        />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  name: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
    color: colors.ink,
  },
  meta: {
    marginTop: 4,
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: colors.muted,
  },
})
