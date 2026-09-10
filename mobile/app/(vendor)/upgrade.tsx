import { useState } from "react"
import { ScrollView, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  BrandTitle,
  Card,
  ErrorText,
  PrimaryButton,
  Screen,
  SecondaryButton,
} from "@/src/components/ui"
import { useAuth } from "@/src/context/AuthContext"
import { useVendor } from "@/src/hooks/useWeddingData"
import {
  VENDOR_FEATURED_PRICE_PKR,
  VENDOR_PLAN_ROWS,
} from "@/src/lib/premium"
import { setVendorFeatured } from "@/src/lib/premium-api"
import { colors, spacing } from "@/src/lib/theme"

export default function VendorUpgradeScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { profile } = useAuth()
  const { vendor } = useVendor(profile?.vendorId ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const featured = vendor?.subscriptionTier === "featured"
  async function activate() {
    if (!profile?.vendorId) {
      setError("No vendor profile linked")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await setVendorFeatured(profile.vendorId, true)
      router.back()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not upgrade")
    } finally {
      setBusy(false)
    }
  }

  async function cancelFeatured() {
    if (!profile?.vendorId) return
    setBusy(true)
    try {
      await setVendorFeatured(profile.vendorId, false)
      router.back()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen style={{ paddingTop: insets.top + spacing.md }}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <BrandTitle
          subtitle={`Featured Vendor · Rs ${VENDOR_FEATURED_PRICE_PKR.toLocaleString("en-PK")}/mo`}
        />
        <ErrorText message={error} />
        <Card>
          {VENDOR_PLAN_ROWS.map((row) => (
            <View key={row.label} style={styles.row}>
              <Text style={styles.label}>{row.label}</Text>
              <Text style={styles.free}>{row.free}</Text>
              <Text style={styles.prem}>{row.premium}</Text>
            </View>
          ))}
        </Card>
        <PrimaryButton
          label={featured ? "Already featured" : "Activate Featured"}
          loading={busy}
          disabled={featured}
          onPress={() => void activate()}
        />
        {featured ? (
          <SecondaryButton
            label="Downgrade to basic"
            onPress={() => void cancelFeatured()}
          />
        ) : null}
        <Text style={styles.note}>
          Same plan as the website. Live card billing can be reconciled by ops;
          activating updates your marketplace ranking now.
        </Text>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  label: {
    flex: 1.2,
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: colors.ink,
  },
  free: {
    flex: 1,
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: colors.muted,
  },
  prem: {
    flex: 1,
    fontFamily: "DMSans_700Bold",
    fontSize: 12,
    color: colors.maroon,
  },
  note: {
    marginTop: spacing.md,
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: colors.muted,
    lineHeight: 20,
  },
})
