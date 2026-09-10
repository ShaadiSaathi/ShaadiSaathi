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
  SecondaryButton,
  Screen,
} from "@/src/components/ui"
import { useAuth } from "@/src/context/AuthContext"
import { useBooking } from "@/src/hooks/useWeddingData"
import { eventLabel } from "@/src/lib/events"
import { checkInBooking, completeBooking } from "@/src/lib/mutations"
import { colors, spacing } from "@/src/lib/theme"
import { openWebPath } from "@/src/lib/web"

export default function VendorJobDetailScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { profile } = useAuth()
  const params = useLocalSearchParams<{ id: string }>()
  const bookingId = typeof params.id === "string" ? params.id : params.id?.[0]
  const { booking, loading } = useBooking(bookingId ?? null)
  const [busy, setBusy] = useState<"checkin" | "complete" | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (loading) {
    return (
      <Screen style={{ paddingTop: insets.top + spacing.md }}>
        <LoadingBlock />
      </Screen>
    )
  }

  if (!booking) {
    return (
      <Screen style={{ paddingTop: insets.top + spacing.md }}>
        <BrandTitle subtitle="Job detail" />
        <EmptyState
          title="Job not found"
          body="This booking may have been removed or you no longer have access."
        />
        <SecondaryButton
          label="Back to jobs"
          onPress={() => router.replace("/(vendor)/jobs")}
        />
      </Screen>
    )
  }

  const status = booking.status.toLowerCase()
  const canCheckIn = status === "confirmed"
  const canComplete = status === "confirmed" || status === "checked_in"

  async function onCheckIn() {
    if (!bookingId) return
    setBusy("checkin")
    setError(null)
    try {
      await checkInBooking(bookingId)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not check in")
    } finally {
      setBusy(null)
    }
  }

  async function onComplete() {
    if (!bookingId) return
    setBusy("complete")
    setError(null)
    try {
      await completeBooking(bookingId)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not complete job")
    } finally {
      setBusy(null)
    }
  }

  return (
    <Screen style={{ paddingTop: insets.top + spacing.md }}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <BrandTitle subtitle="Job detail" />
        <Card>
          <Text style={styles.name}>
            {booking.weddingName || "Wedding booking"}
          </Text>
          {booking.familyName ? (
            <Text style={styles.meta}>Family · {booking.familyName}</Text>
          ) : null}
          <Text style={styles.status}>{booking.status}</Text>
          <Text style={styles.meta}>
            {eventLabel(
              typeof booking.eventId === "string" ? booking.eventId : undefined
            )}
            {booking.eventDate ? ` · ${booking.eventDate}` : ""}
          </Text>
          <Text style={styles.price}>
            Rs {booking.price.toLocaleString("en-PK")}
            {booking.packageName ? ` · ${booking.packageName}` : ""}
          </Text>
          {booking.note ? (
            <Text style={styles.note}>{booking.note}</Text>
          ) : null}
          {booking.counterOffer ? (
            <Text style={styles.counter}>
              Counter: Rs {booking.counterOffer.price.toLocaleString("en-PK")}
              {booking.counterOffer.note
                ? ` — ${booking.counterOffer.note}`
                : ""}
            </Text>
          ) : null}
        </Card>

        <ErrorText message={error} />

        <View style={styles.actions}>
          {canCheckIn ? (
            <PrimaryButton
              label="Check in"
              loading={busy === "checkin"}
              disabled={busy !== null}
              onPress={() => void onCheckIn()}
            />
          ) : null}
          {canComplete ? (
            <PrimaryButton
              label="Mark complete"
              loading={busy === "complete"}
              disabled={busy !== null}
              onPress={() => void onComplete()}
            />
          ) : null}
          <PrimaryButton
            label="Messages"
            disabled={busy !== null}
            onPress={() =>
              router.push(`/(vendor)/job/${booking.id}/messages`)
            }
          />
          <SecondaryButton
            label="Earnings on web"
            onPress={() => void openWebPath("/vendor/jobs")}
          />
          {!profile?.vendorId ? (
            <SecondaryButton
              label="Finish onboarding on web"
              onPress={() => void openWebPath("/vendor/onboarding")}
            />
          ) : null}
          <SecondaryButton
            label="Back to jobs"
            onPress={() => router.back()}
          />
        </View>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  name: {
    fontFamily: "DMSans_700Bold",
    fontSize: 18,
    color: colors.ink,
  },
  status: {
    marginTop: spacing.sm,
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
    color: colors.maroon,
    textTransform: "capitalize",
  },
  meta: {
    marginTop: 4,
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: colors.muted,
  },
  price: {
    marginTop: spacing.sm,
    fontFamily: "DMSans_500Medium",
    fontSize: 16,
    color: colors.maroon,
  },
  note: {
    marginTop: spacing.sm,
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: colors.ink,
    lineHeight: 20,
  },
  counter: {
    marginTop: 8,
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: colors.maroonDark,
  },
  actions: {
    marginTop: spacing.sm,
  },
})
