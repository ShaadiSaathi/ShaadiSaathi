import { StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  BrandTitle,
  Card,
  PrimaryButton,
  SecondaryButton,
  Screen,
} from "@/src/components/ui"
import { useAuth } from "@/src/context/AuthContext"
import { useVendor } from "@/src/hooks/useWeddingData"
import { getApiBaseUrl, getAppEnv } from "@/src/lib/firebase"
import { colors, spacing } from "@/src/lib/theme"

export default function VendorProfileScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { profile, signOut } = useAuth()
  const { vendor } = useVendor(profile?.vendorId ?? null)
  const env = getAppEnv()
  let apiUrl = "—"
  try {
    apiUrl = getApiBaseUrl()
  } catch {
    apiUrl = "not set"
  }

  return (
    <Screen style={{ paddingTop: insets.top + spacing.md }}>
      <BrandTitle subtitle="Vendor account" />
      <Card>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>{profile?.name}</Text>
        <Text style={styles.meta}>{profile?.phone}</Text>
        <Text style={styles.meta}>
          Vendor ID: {profile?.vendorId || "not linked yet"}
        </Text>
        {vendor ? (
          <Text style={styles.meta}>
            {vendor.subscriptionTier === "featured" ? "Featured" : "Basic"} ·{" "}
            {vendor.verificationStatus || "unverified"}
          </Text>
        ) : null}
      </Card>
      <Card>
        <Text style={styles.label}>Backend</Text>
        <Text style={styles.meta}>
          Firebase {env} · API {apiUrl}
        </Text>
      </Card>
      <View style={{ marginTop: spacing.md }}>
        <PrimaryButton
          label="Onboarding / KYC / portfolio"
          onPress={() => router.push("/(vendor)/onboarding")}
        />
        <SecondaryButton
          label="Featured upgrade"
          onPress={() => router.push("/(vendor)/upgrade")}
        />
        <PrimaryButton label="Sign out" onPress={() => void signOut()} />
      </View>
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
    fontFamily: "DMSans_700Bold",
    fontSize: 18,
    color: colors.ink,
  },
  meta: {
    marginTop: 4,
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: colors.muted,
  },
})
