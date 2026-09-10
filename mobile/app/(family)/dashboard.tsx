import { ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { BrandTitle, Card, LoadingBlock, Screen } from "@/src/components/ui"
import { useAuth } from "@/src/context/AuthContext"
import { useWedding } from "@/src/context/WeddingContext"
import { useGuests, useTasks } from "@/src/hooks/useWeddingData"
import { colors, spacing } from "@/src/lib/theme"

export default function FamilyDashboard() {
  const insets = useSafeAreaInsets()
  const { profile } = useAuth()
  const { wedding, weddingId, loading } = useWedding()
  const { guests } = useGuests(weddingId)
  const { tasks } = useTasks(weddingId)

  const done = tasks.filter((t) => t.status === "done").length
  const open = tasks.length - done

  if (loading) {
    return (
      <Screen>
        <LoadingBlock />
      </Screen>
    )
  }

  return (
    <Screen style={{ paddingTop: insets.top + spacing.md }}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <BrandTitle
          subtitle={
            wedding
              ? `${wedding.name}${wedding.firstEventDate ? ` · ${wedding.firstEventDate}` : ""}`
              : "Your wedding plan"
          }
        />
        <Text style={styles.hello}>Salaam, {profile?.name?.split(" ")[0] ?? "there"}</Text>

        <View style={styles.stats}>
          <Stat label="Guests" value={String(guests.length)} />
          <Stat label="Open tasks" value={String(open)} />
          <Stat label="Done" value={String(done)} />
        </View>

        <Card>
          <Text style={styles.cardTitle}>Wedding</Text>
          <Text style={styles.cardBody}>
            {wedding?.isPremium ? "Premium plan" : "Free plan"}
            {wedding?.shareCode ? ` · Share code ${wedding.shareCode}` : ""}
          </Text>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Next tasks</Text>
          {tasks.slice(0, 4).map((t) => (
            <Text key={t.id} style={styles.row}>
              {t.status === "done" ? "✓" : "○"} {t.title}
            </Text>
          ))}
          {tasks.length === 0 ? (
            <Text style={styles.muted}>No tasks yet — add some on the Tasks tab.</Text>
          ) : null}
        </Card>
      </ScrollView>
    </Screen>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  hello: {
    fontFamily: "DMSans_500Medium",
    fontSize: 16,
    color: colors.muted,
    marginBottom: spacing.lg,
  },
  stats: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 28,
    color: colors.maroon,
  },
  statLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
  },
  cardTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
    color: colors.maroonDark,
    marginBottom: spacing.sm,
  },
  cardBody: {
    fontFamily: "DMSans_400Regular",
    color: colors.ink,
    fontSize: 15,
  },
  row: {
    fontFamily: "DMSans_400Regular",
    color: colors.ink,
    fontSize: 15,
    marginBottom: 6,
  },
  muted: {
    fontFamily: "DMSans_400Regular",
    color: colors.muted,
    fontSize: 14,
  },
})
