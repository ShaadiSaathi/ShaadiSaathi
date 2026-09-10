import { useMemo, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { WebView } from "react-native-webview"
import {
  BrandTitle,
  ErrorText,
  LoadingBlock,
  PrimaryButton,
  Screen,
  SecondaryButton,
} from "@/src/components/ui"
import { useAuth } from "@/src/context/AuthContext"
import { useWedding } from "@/src/context/WeddingContext"
import { useBooking } from "@/src/hooks/useWeddingData"
import {
  completeAiTopup,
  completeDepositPayment,
  createAiTopup,
  createBalancePayment,
  createDepositPayment,
  setWeddingPremium,
} from "@/src/lib/premium-api"
import { FAMILY_PREMIUM_PRICE_PKR } from "@/src/lib/premium"
import { stripePaymentHtml } from "@/src/lib/stripe-html"
import { colors, spacing } from "@/src/lib/theme"

type Kind = "deposit" | "balance" | "ai-topup" | "family-premium"

export default function PayScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { profile } = useAuth()
  const { wedding, weddingId } = useWedding()
  const params = useLocalSearchParams<{
    kind?: string
    bookingId?: string
  }>()
  const kind = (params.kind as Kind) || "deposit"
  const bookingId =
    typeof params.bookingId === "string" ? params.bookingId : undefined
  const { booking } = useBooking(bookingId ?? null)

  const [html, setHtml] = useState<string | null>(null)
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const title = useMemo(() => {
    if (kind === "ai-topup") return "AI question top-up"
    if (kind === "balance") return "Pay remaining balance"
    if (kind === "family-premium") return "Family Premium"
    return "Pay deposit"
  }, [kind])

  async function start() {
    setBusy(true)
    setError(null)
    try {
      if (kind === "ai-topup") {
        const pi = await createAiTopup()
        setPaymentIntentId(pi.paymentIntentId)
        setHtml(
          stripePaymentHtml({
            publishableKey: pi.publishableKey,
            clientSecret: pi.clientSecret,
            title: "AI top-up",
          })
        )
        return
      }
      if (kind === "family-premium") {
        // No live Stripe session for family premium yet — unlock locally after
        // acknowledging the same price as web (ops can reconcile).
        if (!weddingId) throw new Error("No wedding linked")
        await setWeddingPremium(weddingId, true)
        setDone(true)
        return
      }
      if (!bookingId || !booking || !weddingId) {
        throw new Error("Missing booking details")
      }
      if (kind === "balance") {
        const pi = await createBalancePayment(bookingId)
        setPaymentIntentId(pi.paymentIntentId)
        setHtml(
          stripePaymentHtml({
            publishableKey: pi.publishableKey,
            clientSecret: pi.clientSecret,
            title: `Balance · ${booking.vendorName}`,
          })
        )
        return
      }
      const deposit =
        typeof (booking as { price?: number }).price === "number"
          ? Math.round(booking.price * 0.3)
          : Math.round(booking.price * 0.3)
      const pi = await createDepositPayment({
        bookingId,
        weddingId,
        vendorId: booking.vendorId,
        amountPkr: deposit,
        totalPrice: booking.price,
        eventId: String(booking.eventId || "mehndi"),
        familyName: profile?.name,
        weddingName: wedding?.name,
        vendorName: booking.vendorName,
        packageName: booking.packageName,
      })
      setPaymentIntentId(pi.paymentIntentId)
      setHtml(
        stripePaymentHtml({
          publishableKey: pi.publishableKey,
          clientSecret: pi.clientSecret,
          title: `Deposit · ${booking.vendorName}`,
        })
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start payment")
    } finally {
      setBusy(false)
    }
  }

  async function onWebMessage(raw: string) {
    try {
      const data = JSON.parse(raw) as {
        type: string
        paymentIntentId?: string
        message?: string
      }
      if (data.type === "error") {
        setError(data.message || "Payment failed")
        return
      }
      if (data.type !== "success") return
      const piId = data.paymentIntentId || paymentIntentId
      if (!piId) throw new Error("Missing payment intent")
      setBusy(true)
      if (kind === "ai-topup") {
        await completeAiTopup(piId)
      } else if (kind === "deposit" && bookingId) {
        await completeDepositPayment({ bookingId, paymentIntentId: piId })
      }
      // balance completes via Stripe webhook
      setDone(true)
      setHtml(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not finalize payment")
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <Screen style={{ paddingTop: insets.top + spacing.md }}>
        <BrandTitle subtitle={title} />
        <Text style={styles.success}>All set — payment recorded.</Text>
        {kind === "family-premium" ? (
          <Text style={styles.meta}>
            Premium unlocked for Rs{" "}
            {FAMILY_PREMIUM_PRICE_PKR.toLocaleString("en-PK")} plan benefits.
          </Text>
        ) : null}
        <PrimaryButton label="Done" onPress={() => router.back()} />
      </Screen>
    )
  }

  return (
    <Screen
      style={{
        paddingTop: insets.top + spacing.md,
        paddingHorizontal: html ? 0 : spacing.lg,
      }}
    >
      {!html ? (
        <View style={{ paddingHorizontal: html ? spacing.lg : 0, flex: 1 }}>
          <BrandTitle subtitle={title} />
          <ErrorText message={error} />
          {busy ? <LoadingBlock /> : null}
          <PrimaryButton
            label="Start payment"
            loading={busy}
            onPress={() => void start()}
          />
          <SecondaryButton label="Cancel" onPress={() => router.back()} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <WebView
            originWhitelist={["*"]}
            source={{ html }}
            onMessage={(e) => void onWebMessage(e.nativeEvent.data)}
            style={{ flex: 1, backgroundColor: colors.ivory }}
          />
          <View style={{ padding: spacing.md }}>
            <ErrorText message={error} />
            <SecondaryButton
              label="Close"
              onPress={() => {
                setHtml(null)
                router.back()
              }}
            />
          </View>
        </View>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  success: {
    fontFamily: "DMSans_700Bold",
    fontSize: 18,
    color: colors.maroon,
    marginBottom: spacing.md,
  },
  meta: {
    fontFamily: "DMSans_400Regular",
    color: colors.muted,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
})
