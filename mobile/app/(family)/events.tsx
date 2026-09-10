import { ScrollView, StyleSheet, Text } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { BrandTitle, Card, Screen } from "@/src/components/ui"
import { useWedding } from "@/src/context/WeddingContext"
import { WEDDING_EVENTS } from "@/src/lib/events"
import { colors, spacing } from "@/src/lib/theme"

export default function EventsScreen() {
  const insets = useSafeAreaInsets()
  const { wedding } = useWedding()
  const overrides = wedding?.eventOverrides ?? {}

  return (
    <Screen style={{ paddingTop: insets.top + spacing.md }}>
      <BrandTitle subtitle="Ceremony schedule" />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        {WEDDING_EVENTS.map((event) => {
          const override = overrides[event.id]
          const date =
            override?.date || wedding?.firstEventDate || "Date TBD"
          const time = override?.time || event.defaultTime
          return (
            <Card key={event.id}>
              <Text style={styles.name}>{event.name}</Text>
              <Text style={styles.meta}>
                {date} · {time}
              </Text>
              <Text style={styles.hint}>{event.venueHint}</Text>
            </Card>
          )
        })}
        <Text style={styles.footer}>
          Edit dates and RSVP locks on the web schedule — changes sync here.
        </Text>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  name: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 22,
    color: colors.maroon,
  },
  meta: {
    marginTop: 6,
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
  footer: {
    marginTop: spacing.md,
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 20,
  },
})
