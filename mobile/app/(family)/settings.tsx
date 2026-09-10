import { StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  BrandTitle,
  Card,
  PrimaryButton,
  Screen,
} from "@/src/components/ui"
import { useAuth } from "@/src/context/AuthContext"
import { useWedding } from "@/src/context/WeddingContext"
import { colors, spacing } from "@/src/lib/theme"

export default function SettingsScreen() {
  const insets = useSafeAreaInsets()
  const { profile, signOut } = useAuth()
  const { wedding } = useWedding()

  return (
    <Screen style={{ paddingTop: insets.top + spacing.md }}>
      <BrandTitle subtitle="Account & wedding" />
      <Card>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.value}>{profile?.name}</Text>
        <Text style={styles.meta}>{profile?.phone}</Text>
      </Card>
      <Card>
        <Text style={styles.label}>Wedding</Text>
        <Text style={styles.value}>{wedding?.name ?? "—"}</Text>
        <Text style={styles.meta}>
          {wedding?.isPremium ? "Premium" : "Free"}
          {wedding?.shareCode ? ` · ${wedding.shareCode}` : ""}
        </Text>
      </Card>
      <View style={{ marginTop: spacing.md }}>
        <PrimaryButton label="Sign out" onPress={() => void signOut()} />
      </View>
      <Text style={styles.footer}>
        Shaadi Saathi mobile · same Firebase backend as the web app
      </Text>
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
  footer: {
    marginTop: spacing.xl,
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
  },
})
