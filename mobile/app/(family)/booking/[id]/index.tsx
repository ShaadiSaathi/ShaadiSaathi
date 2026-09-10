import { useState } from "react"
import { ScrollView, StyleSheet, Text, View } from "react-native"
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
import { useBooking } from "@/src/hooks/useWeddingData"
import { eventLabel } from "@/src/lib/events"
import {
  acceptCounterOffer,
  confirmBooking,
} from "@/src/lib/mutations"
import { colors, spacing } from "@/src/lib/theme"

function formatPkr(amount: number) {
  return `Rs ${amount.toLocaleString("en-PK")}`
}

export default function BookingDetailScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const bookingId = typeof id === "string" ? id : id?.[0] ?? null
  const { booking, loading } = useBooking(bookingId)
  const [busy, setBusy] = useState<"confirm" | "counter" | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onConfirm() {
    if (!bookingId) return
    setBusy("confirm")
    setError(null)
    try {
      await confirmBooking(bookingId)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not confirm")
    } finally {
      setBusy(null)
    }
  }

  async function onAcceptCounter() {
    if (!bookingId) return
    setBusy("counter")
    setError(null)
    try {
      await acceptCounterOffer(bookingId)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not accept offer")
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <Screen style={{ paddingTop: insets.top + spacing.md }}>
        <LoadingBlock />
      </Screen>
    )
  }

  if (!booking || !bookingId) {
    return (
      <Screen style={{ paddingTop: insets.top + spacing.md }}>
        <BrandTitle subtitle="Booking" />
        <EmptyState title="Booking not found" body="It may have been removed." />
        <SecondaryButton label="Back" onPress={() => router.back()} />
      </Screen>
    )
  }

  const canConfirm =
    booking.status === "requested" || booking.status === "accepted"
  const hasCounter =
    Boolean(booking.counterOffer) &&
    (booking.status === "countered" || Boolean(booking.counterOffer))

  return (
    <Screen style={{ paddingTop: insets.top + spacing.md }}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <BrandTitle subtitle={booking.vendorName} />
        <ErrorText message={error} />

        <Card>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.status}>{booking.status}</Text>
          <Text style={styles.meta}>
            {booking.eventId ? eventLabel(String(booking.eventId)) : "Event"}
            {booking.eventDate ? ` · ${booking.eventDate}` : ""}
          </Text>
          <Text style={styles.price}>
            {formatPkr(booking.price)}
            {booking.packageName ? ` · ${booking.packageName}` : ""}
          </Text>
          {booking.note ? (
            <Text style={styles.note}>{booking.note}</Text>
          ) : null}
        </Card>

        {booking.counterOffer ? (
          <Card>
            <Text style={styles.label}>Counter offer</Text>
            <Text style={styles.price}>
              {formatPkr(booking.counterOffer.price)}
            </Text>
            {booking.counterOffer.note ? (
              <Text style={styles.note}>{booking.counterOffer.note}</Text>
            ) : null}
          </Card>
        ) : null}

        <View style={styles.actions}>
          {canConfirm ? (
            <PrimaryButton
              label="Confirm booking"
              loading={busy === "confirm"}
              disabled={busy !== null}
              onPress={() => void onConfirm()}
            />
          ) : null}
          {hasCounter ? (
            <PrimaryButton
              label="Accept counter offer"
              loading={busy === "counter"}
              disabled={busy !== null}
              onPress={() => void onAcceptCounter()}
            />
          ) : null}
          <SecondaryButton
            label="Messages"
            onPress={() =>
              router.push(`/(family)/booking/${bookingId}/messages`)
            }
          />
          <SecondaryButton
            label="Pay deposit"
            onPress={() =>
              router.push({
                pathname: "/(family)/pay",
                params: { kind: "deposit", bookingId },
              })
            }
          />
          <SecondaryButton
            label="Pay balance"
            onPress={() =>
              router.push({
                pathname: "/(family)/pay",
                params: { kind: "balance", bookingId },
              })
            }
          />
          <SecondaryButton label="Back" onPress={() => router.back()} />
        </View>
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
  status: {
    fontFamily: "DMSans_700Bold",
    fontSize: 18,
    color: colors.ink,
    textTransform: "capitalize",
  },
  meta: {
    marginTop: 6,
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: colors.muted,
  },
  price: {
    marginTop: 10,
    fontFamily: "DMSans_500Medium",
    fontSize: 17,
    color: colors.maroon,
  },
  note: {
    marginTop: 8,
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
})
