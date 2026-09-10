import { StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  BrandTitle,
  Card,
  PrimaryButton,
  SecondaryButton,
  Screen,
} from "@/src/components/ui"
import { useAuth } from "@/src/context/AuthContext"
import { getApiBaseUrl, getAppEnv } from "@/src/lib/firebase"
import { colors, spacing } from "@/src/lib/theme"
import { openWebPath } from "@/src/lib/web"

export default function VendorProfileScreen() {
  const insets = useSafeAreaInsets()
  const { profile, signOut } = useAuth()
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
      </Card>
      <Card>
        <Text style={styles.label}>Backend</Text>
        <Text style={styles.meta}>
          Firebase {env} · API {apiUrl}
        </Text>
      </Card>
      <View style={{ marginTop: spacing.md }}>
        <PrimaryButton
          label="Edit profile on web"
          onPress={() => void openWebPath("/vendor/profile")}
        />
        <SecondaryButton
          label="Onboarding"
          onPress={() => void openWebPath("/vendor/onboarding")}
        />
        <SecondaryButton
          label="Upgrade"
          onPress={() => void openWebPath("/vendor/upgrade")}
        />
        <SecondaryButton
          label="Subscription"
          onPress={() => void openWebPath("/vendor/subscription")}
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
