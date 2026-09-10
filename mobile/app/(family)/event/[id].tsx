import { useMemo } from "react"
import { Pressable, ScrollView, StyleSheet, Text } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  BrandTitle,
  Card,
  EmptyState,
  LoadingBlock,
  Screen,
  SecondaryButton,
} from "@/src/components/ui"
import { useWedding } from "@/src/context/WeddingContext"
import {
  useBookings,
  useGuests,
  useTasks,
} from "@/src/hooks/useWeddingData"
import { WEDDING_EVENTS, eventLabel } from "@/src/lib/events"
import { colors, spacing } from "@/src/lib/theme"
import type { EventId } from "@/src/lib/types"

export default function EventDetailScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const eventId = (typeof id === "string" ? id : id?.[0]) as EventId | undefined
  const { wedding, weddingId, loading: weddingLoading } = useWedding()
  const { guests, loading: guestsLoading } = useGuests(weddingId)
  const { bookings, loading: bookingsLoading } = useBookings(weddingId)
  const { tasks, loading: tasksLoading } = useTasks(weddingId)

  const event = useMemo(
    () => WEDDING_EVENTS.find((e) => e.id === eventId),
    [eventId]
  )
  const override = eventId ? wedding?.eventOverrides?.[eventId] : undefined

  const relatedGuests = useMemo(
    () => guests.filter((g) => eventId && g.events.includes(eventId)),
    [guests, eventId]
  )
  const relatedBookings = useMemo(
    () => bookings.filter((b) => b.eventId === eventId),
    [bookings, eventId]
  )
  const relatedTasks = useMemo(
    () => tasks.filter((t) => t.eventId === eventId),
    [tasks, eventId]
  )

  const loading =
    weddingLoading || guestsLoading || bookingsLoading || tasksLoading

  if (loading) {
    return (
      <Screen style={{ paddingTop: insets.top + spacing.md }}>
        <LoadingBlock />
      </Screen>
    )
  }

  if (!event || !eventId) {
    return (
      <Screen style={{ paddingTop: insets.top + spacing.md }}>
        <BrandTitle subtitle="Event" />
        <EmptyState title="Event not found" body="Pick an event from the list." />
        <SecondaryButton label="Back" onPress={() => router.back()} />
      </Screen>
    )
  }

  const date = override?.date || wedding?.firstEventDate || "Date TBD"
  const time = override?.time || event.defaultTime

  return (
    <Screen style={{ paddingTop: insets.top + spacing.md }}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <BrandTitle subtitle={event.name} />

        <Card>
          <Text style={styles.meta}>
            {date} · {time}
          </Text>
          <Text style={styles.hint}>{event.venueHint}</Text>
          <Text style={styles.body}>{event.description}</Text>
        </Card>

        <Card>
          <Text style={styles.section}>Guests</Text>
          <Text style={styles.value}>
            {relatedGuests.length} invited to {eventLabel(eventId)}
          </Text>
        </Card>

        <Text style={styles.sectionTitle}>Bookings</Text>
        {relatedBookings.length === 0 ? (
          <Text style={styles.empty}>No bookings for this event yet.</Text>
        ) : (
          relatedBookings.map((b) => (
            <Pressable
              key={b.id}
              onPress={() => router.push(`/(family)/booking/${b.id}`)}
            >
              <Card>
                <Text style={styles.rowTitle}>{b.vendorName}</Text>
                <Text style={styles.meta}>
                  {b.status} · Rs {b.price.toLocaleString("en-PK")}
                </Text>
              </Card>
            </Pressable>
          ))
        )}

        <Text style={styles.sectionTitle}>Tasks</Text>
        {relatedTasks.length === 0 ? (
          <Text style={styles.empty}>No tasks linked to this event.</Text>
        ) : (
          relatedTasks.map((t) => (
            <Card key={t.id}>
              <Text style={styles.rowTitle}>
                {t.status === "done" ? "✓ " : "○ "}
                {t.title}
              </Text>
              <Text style={styles.meta}>
                {t.assignee || "Unassigned"}
                {t.dueDate ? ` · ${t.dueDate}` : ""}
              </Text>
            </Card>
          ))
        )}

        <SecondaryButton label="Back" onPress={() => router.back()} />
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  meta: {
    fontFamily: "DMSans_500Medium",
    fontSize: 15,
    color: colors.ink,
  },
  hint: {
    marginTop: 4,
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: colors.muted,
  },
  body: {
    marginTop: spacing.sm,
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    color: colors.ink,
    lineHeight: 22,
  },
  section: {
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
    color: colors.maroonDark,
    marginBottom: 4,
  },
  value: {
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    color: colors.ink,
  },
  sectionTitle: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
    color: colors.maroonDark,
  },
  rowTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 15,
    color: colors.ink,
  },
  empty: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
})
