import { StyleSheet, Text } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { BrandTitle, Card, Screen } from "@/src/components/ui"
import { useAuth } from "@/src/context/AuthContext"
import { useVendorJobs } from "@/src/hooks/useWeddingData"
import { colors, spacing } from "@/src/lib/theme"

export default function VendorDashboard() {
  const insets = useSafeAreaInsets()
  const { profile } = useAuth()
  const { jobs } = useVendorJobs(profile?.vendorId ?? null)
  const open = jobs.filter((j) => j.status === "requested" || j.status === "confirmed")

  return (
    <Screen style={{ paddingTop: insets.top + spacing.md }}>
      <BrandTitle subtitle={`Salaam, ${profile?.name?.split(" ")[0] ?? "vendor"}`} />
      <Card>
        <Text style={styles.stat}>{jobs.length}</Text>
        <Text style={styles.label}>Total bookings</Text>
      </Card>
      <Card>
        <Text style={styles.stat}>{open.length}</Text>
        <Text style={styles.label}>Active jobs</Text>
      </Card>
      {!profile?.vendorId ? (
        <Card>
          <Text style={styles.note}>
            Finish vendor onboarding on the web app to link your vendor profile.
            Your phone login already works here.
          </Text>
        </Card>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  stat: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 36,
    color: colors.maroon,
  },
  label: {
    fontFamily: "DMSans_400Regular",
    color: colors.muted,
    marginTop: 4,
  },
  note: {
    fontFamily: "DMSans_400Regular",
    color: colors.ink,
    lineHeight: 22,
  },
})
