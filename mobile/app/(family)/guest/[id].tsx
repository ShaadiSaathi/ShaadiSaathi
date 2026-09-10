import { useMemo, useState } from "react"
import {
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
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
import { eventLabel } from "@/src/lib/events"
import { getApiBaseUrl } from "@/src/lib/firebase"
import { setGuestRsvp } from "@/src/lib/mutations"
import { colors, spacing } from "@/src/lib/theme"
import type { EventId, RsvpStatus } from "@/src/lib/types"

const RSVP_OPTIONS: RsvpStatus[] = ["confirmed", "pending", "declined"]

export default function GuestDetailScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const guestId = typeof id === "string" ? id : id?.[0] ?? null
  const { weddingId } = useWedding()
  const { guests, loading, error } = useGuests(weddingId)
  const guest = useMemo(
    () => guests.find((g) => g.id === guestId) ?? null,
    [guests, guestId]
  )
  const [busy, setBusy] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function updateRsvp(eventId: EventId, status: RsvpStatus) {
    if (!guest) return
    const token = guest.inviteToken || guest.id
    setBusy(`${eventId}:${status}`)
    setActionError(null)
    try {
      await setGuestRsvp(token, eventId, status)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not update RSVP")
    } finally {
      setBusy(null)
    }
  }

  async function shareInvite() {
    if (!guest) return
    const token = guest.inviteToken || guest.id
    try {
      const url = `${getApiBaseUrl()}/invite/${token}`
      await Share.share({
        message: `You're invited to our wedding — RSVP here: ${url}`,
        url,
      })
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not share invite")
    }
  }

  if (loading) {
    return (
      <Screen style={{ paddingTop: insets.top + spacing.md }}>
        <LoadingBlock />
      </Screen>
    )
  }

  if (!guest) {
    return (
      <Screen style={{ paddingTop: insets.top + spacing.md }}>
        <BrandTitle subtitle="Guest" />
        <EmptyState title="Guest not found" body="They may have been removed." />
        <SecondaryButton label="Back to guests" onPress={() => router.back()} />
      </Screen>
    )
  }

  return (
    <Screen style={{ paddingTop: insets.top + spacing.md }}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <BrandTitle subtitle={guest.name} />
        <ErrorText message={error} />
        <ErrorText message={actionError} />

        <Card>
          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>{guest.phone || "—"}</Text>
          {guest.notes ? (
            <>
              <Text style={[styles.label, { marginTop: spacing.md }]}>Notes</Text>
              <Text style={styles.value}>{guest.notes}</Text>
            </>
          ) : null}
        </Card>

        <PrimaryButton label="Share invite link" onPress={() => void shareInvite()} />

        <Text style={styles.section}>RSVP by event</Text>
        {guest.events.map((eventId) => {
          const current = guest.rsvp[eventId] ?? "pending"
          return (
            <Card key={eventId}>
              <Text style={styles.eventName}>{eventLabel(eventId)}</Text>
              <Text style={styles.meta}>Current: {current}</Text>
              <View style={styles.rsvpRow}>
                {RSVP_OPTIONS.map((status) => {
                  const selected = current === status
                  return (
                    <Pressable
                      key={status}
                      onPress={() => void updateRsvp(eventId, status)}
                      disabled={busy !== null}
                      style={[
                        styles.rsvpBtn,
                        selected && styles.rsvpSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.rsvpText,
                          selected && styles.rsvpTextSelected,
                        ]}
                      >
                        {busy === `${eventId}:${status}` ? "…" : status}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </Card>
          )
        })}

        <SecondaryButton label="Back" onPress={() => router.back()} />
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  label: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    color: colors.muted,
    marginBottom: 4,
  },
  value: {
    fontFamily: "DMSans_400Regular",
    fontSize: 16,
    color: colors.ink,
  },
  section: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
    color: colors.maroonDark,
  },
  eventName: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
    color: colors.ink,
  },
  meta: {
    marginTop: 4,
    marginBottom: spacing.sm,
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: colors.muted,
    textTransform: "capitalize",
  },
  rsvpRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  rsvpBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    backgroundColor: colors.white,
  },
  rsvpSelected: {
    backgroundColor: colors.maroon,
    borderColor: colors.maroon,
  },
  rsvpText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    color: colors.maroonDark,
    textTransform: "capitalize",
  },
  rsvpTextSelected: {
    color: colors.white,
  },
})
