import { useMemo, useState } from "react"
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  BrandTitle,
  Card,
  EmptyState,
  ErrorText,
  LoadingBlock,
  PrimaryButton,
  Screen,
  SecondaryButton,
} from "@/src/components/ui"
import { useWedding } from "@/src/context/WeddingContext"
import { useGuests } from "@/src/hooks/useWeddingData"
import { TABLE_COUNT } from "@/src/lib/premium"
import { updateWeddingSeating } from "@/src/lib/premium-api"
import { colors, spacing } from "@/src/lib/theme"
import type { SeatingAssignment } from "@/src/lib/types"

export default function SeatingScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { wedding, weddingId, loading: weddingLoading } = useWedding()
  const { guests, loading: guestsLoading } = useGuests(weddingId)
  const [selectedTable, setSelectedTable] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [local, setLocal] = useState<SeatingAssignment[] | null>(null)

  const assignments = local ?? wedding?.seatingAssignments ?? []
  const premium = Boolean(wedding?.isPremium)

  const byGuest = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of assignments) map.set(a.guestId, a.tableNumber)
    return map
  }, [assignments])

  async function persist(next: SeatingAssignment[]) {
    if (!weddingId) return
    setLocal(next)
    setBusy(true)
    setError(null)
    try {
      await updateWeddingSeating(weddingId, next)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save seating")
    } finally {
      setBusy(false)
    }
  }

  function assign(guestId: string) {
    const next = assignments.filter((a) => a.guestId !== guestId)
    next.push({ guestId, tableNumber: selectedTable })
    void persist(next)
  }

  function clear(guestId: string) {
    void persist(assignments.filter((a) => a.guestId !== guestId))
  }

  if (weddingLoading || guestsLoading) {
    return (
      <Screen style={{ paddingTop: insets.top + spacing.md }}>
        <LoadingBlock />
      </Screen>
    )
  }

  if (!premium) {
    return (
      <Screen style={{ paddingTop: insets.top + spacing.md }}>
        <BrandTitle subtitle="Seating planner" />
        <Card>
          <Text style={styles.lock}>
            Seating is a Premium feature. Upgrade to assign guests to tables.
          </Text>
          <PrimaryButton
            label="View Premium"
            onPress={() => router.push("/(family)/upgrade")}
          />
        </Card>
      </Screen>
    )
  }

  return (
    <Screen style={{ paddingTop: insets.top + spacing.md }}>
      <BrandTitle subtitle={`Table ${selectedTable} · tap a guest to assign`} />
      <ErrorText message={error} />
      <View style={styles.tables}>
        {Array.from({ length: TABLE_COUNT }, (_, i) => i + 1).map((n) => (
          <Pressable
            key={n}
            onPress={() => setSelectedTable(n)}
            style={[
              styles.tableChip,
              selectedTable === n && styles.tableChipOn,
            ]}
          >
            <Text
              style={[
                styles.tableChipText,
                selectedTable === n && styles.tableChipTextOn,
              ]}
            >
              {n}
            </Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={guests}
        keyExtractor={(g) => g.id}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        ListEmptyComponent={
          <EmptyState
            title="No guests"
            body="Add guests first, then seat them here."
          />
        }
        renderItem={({ item }) => {
          const table = byGuest.get(item.id)
          return (
            <Card>
              <Pressable onPress={() => assign(item.id)}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>
                  {table ? `Table ${table}` : "Unassigned"} · tap to seat at
                  table {selectedTable}
                </Text>
              </Pressable>
              {table ? (
                <SecondaryButton
                  label="Clear"
                  onPress={() => clear(item.id)}
                />
              ) : null}
            </Card>
          )
        }}
      />
      {busy ? <Text style={styles.saving}>Saving…</Text> : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  lock: {
    fontFamily: "DMSans_400Regular",
    color: colors.ink,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  tables: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: spacing.md,
  },
  tableChip: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  tableChipOn: {
    backgroundColor: colors.maroon,
    borderColor: colors.maroon,
  },
  tableChipText: {
    fontFamily: "DMSans_700Bold",
    color: colors.ink,
  },
  tableChipTextOn: { color: colors.white },
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
  saving: {
    textAlign: "center",
    fontFamily: "DMSans_400Regular",
    color: colors.muted,
    marginBottom: spacing.sm,
  },
})
