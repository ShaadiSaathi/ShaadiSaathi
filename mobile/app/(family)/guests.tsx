import { useState } from "react"
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
  Field,
  LoadingBlock,
  PrimaryButton,
  Screen,
  SecondaryButton,
} from "@/src/components/ui"
import { useWedding } from "@/src/context/WeddingContext"
import { useGuests } from "@/src/hooks/useWeddingData"
import { addGuest } from "@/src/lib/mutations"
import { colors, spacing } from "@/src/lib/theme"
import type { RsvpStatus } from "@/src/lib/types"

function rsvpSummary(rsvp: Partial<Record<string, RsvpStatus | null>>) {
  const statuses = Object.values(rsvp).filter(Boolean) as RsvpStatus[]
  const confirmed = statuses.filter((s) => s === "confirmed").length
  const pending = statuses.filter((s) => s === "pending").length
  const declined = statuses.filter((s) => s === "declined").length
  const parts: string[] = []
  if (confirmed) parts.push(`${confirmed} confirmed`)
  if (pending) parts.push(`${pending} pending`)
  if (declined) parts.push(`${declined} declined`)
  return parts.length ? parts.join(" · ") : "No RSVPs yet"
}

export default function GuestsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { weddingId } = useWedding()
  const { guests, loading, error } = useGuests(weddingId)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function onAdd() {
    if (!weddingId || !name.trim()) {
      setFormError("Name is required")
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      await addGuest({
        weddingId,
        name: name.trim(),
        phone: phone.trim() || undefined,
      })
      setName("")
      setPhone("")
      setShowForm(false)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not add guest")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Screen style={{ paddingTop: insets.top + spacing.md }}>
      <BrandTitle subtitle={`${guests.length} on the list`} />
      <ErrorText message={error} />
      <View style={styles.actions}>
        {showForm ? (
          <SecondaryButton label="Cancel" onPress={() => setShowForm(false)} />
        ) : (
          <PrimaryButton label="Add guest" onPress={() => setShowForm(true)} />
        )}
      </View>

      {showForm ? (
        <Card>
          <Field
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="Guest name"
            autoCapitalize="words"
          />
          <Field
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            placeholder="+92…"
            keyboardType="phone-pad"
          />
          <ErrorText message={formError} />
          <PrimaryButton
            label="Save guest"
            loading={saving}
            onPress={() => void onAdd()}
          />
        </Card>
      ) : null}

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
              body="Add a guest to start collecting RSVPs and sharing invite links."
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/(family)/guest/${item.id}`)}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Card>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>{item.phone || "No phone"}</Text>
                <Text style={styles.meta}>
                  {item.events.length} event
                  {item.events.length === 1 ? "" : "s"}
                  {" · "}
                  {rsvpSummary(item.rsvp)}
                </Text>
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  actions: { marginBottom: spacing.sm },
  pressed: { opacity: 0.85 },
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
