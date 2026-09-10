import { useState } from "react"
import { FlatList, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  BrandTitle,
  Card,
  EmptyState,
  ErrorText,
  Field,
  LoadingBlock,
  PrimaryButton,
  SecondaryButton,
  Screen,
} from "@/src/components/ui"
import { useAuth } from "@/src/context/AuthContext"
import { useVendorJobs } from "@/src/hooks/useWeddingData"
import { eventLabel } from "@/src/lib/events"
import { setCounterOffer, updateBookingStatus } from "@/src/lib/mutations"
import { colors, spacing } from "@/src/lib/theme"
import type { AppBooking } from "@/src/lib/types"

export default function VendorRequestsScreen() {
  const insets = useSafeAreaInsets()
  const { profile } = useAuth()
  const { jobs, loading, error } = useVendorJobs(profile?.vendorId ?? null)
  const requests = jobs.filter(
    (j) => j.status === "requested" || j.status === "countered"
  )

  return (
    <Screen style={{ paddingTop: insets.top + spacing.md }}>
      <BrandTitle subtitle="Incoming booking requests" />
      <ErrorText message={error} />
      {loading ? (
        <LoadingBlock />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          ListEmptyComponent={
            <EmptyState
              title="All caught up"
              body="New requests from families will show up here."
            />
          }
          renderItem={({ item }) => <RequestCard job={item} />}
        />
      )}
    </Screen>
  )
}

function RequestCard({ job }: { job: AppBooking }) {
  const [price, setPrice] = useState(
    String(job.counterOffer?.price ?? job.price ?? "")
  )
  const [note, setNote] = useState(job.counterOffer?.note ?? "")
  const [busy, setBusy] = useState<"accept" | "decline" | "counter" | null>(
    null
  )
  const [actionError, setActionError] = useState<string | null>(null)

  async function accept() {
    setBusy("accept")
    setActionError(null)
    try {
      await updateBookingStatus(job.id, "confirmed")
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not accept")
    } finally {
      setBusy(null)
    }
  }

  async function decline() {
    setBusy("decline")
    setActionError(null)
    try {
      await updateBookingStatus(job.id, "declined")
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not decline")
    } finally {
      setBusy(null)
    }
  }

  async function counter() {
    const amount = Number(price.replace(/,/g, ""))
    if (!Number.isFinite(amount) || amount <= 0) {
      setActionError("Enter a valid price")
      return
    }
    setBusy("counter")
    setActionError(null)
    try {
      await setCounterOffer(job.id, amount, note.trim() || undefined)
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Could not send counter offer"
      )
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card>
      <Text style={styles.name}>
        {job.weddingName || job.familyName || "Wedding booking"}
      </Text>
      {job.familyName && job.weddingName ? (
        <Text style={styles.meta}>{job.familyName}</Text>
      ) : null}
      <Text style={styles.meta}>
        {job.status}
        {" · "}
        {eventLabel(
          typeof job.eventId === "string" ? job.eventId : undefined
        )}
        {job.eventDate ? ` · ${job.eventDate}` : ""}
      </Text>
      <Text style={styles.price}>
        Rs {job.price.toLocaleString("en-PK")}
        {job.packageName ? ` · ${job.packageName}` : ""}
      </Text>
      {job.note ? <Text style={styles.note}>{job.note}</Text> : null}
      {job.counterOffer ? (
        <Text style={styles.counter}>
          Counter: Rs {job.counterOffer.price.toLocaleString("en-PK")}
          {job.counterOffer.note ? ` — ${job.counterOffer.note}` : ""}
        </Text>
      ) : null}

      <ErrorText message={actionError} />

      <View style={styles.actions}>
        <PrimaryButton
          label="Accept"
          loading={busy === "accept"}
          disabled={busy !== null}
          onPress={() => void accept()}
        />
        <SecondaryButton
          label={busy === "decline" ? "Declining…" : "Decline"}
          onPress={() => void decline()}
        />
      </View>

      <Field
        label="Counter price (Rs)"
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
        placeholder="e.g. 85000"
      />
      <Field
        label="Note (optional)"
        value={note}
        onChangeText={setNote}
        placeholder="Package or timing notes"
      />
      <PrimaryButton
        label="Send counter offer"
        loading={busy === "counter"}
        disabled={busy !== null}
        onPress={() => void counter()}
      />
    </Card>
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
    textTransform: "capitalize",
  },
  price: {
    marginTop: 8,
    fontFamily: "DMSans_500Medium",
    fontSize: 15,
    color: colors.maroon,
  },
  note: {
    marginTop: 8,
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
    marginBottom: spacing.sm,
  },
})
