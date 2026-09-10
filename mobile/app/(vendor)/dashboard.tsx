import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { BrandTitle, Card, Screen } from "@/src/components/ui"
import { useAuth } from "@/src/context/AuthContext"
import {
  useNotifications,
  useVendorJobs,
} from "@/src/hooks/useWeddingData"
import { colors, spacing } from "@/src/lib/theme"
import { openWebPath } from "@/src/lib/web"

export default function VendorDashboard() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { profile, user } = useAuth()
  const { jobs } = useVendorJobs(profile?.vendorId ?? null)
  const { notifications } = useNotifications(user?.uid ?? null)

  const pending = jobs.filter(
    (j) => j.status === "requested" || j.status === "countered"
  )
  const active = jobs.filter(
    (j) => j.status === "confirmed" || j.status === "checked_in"
  )
  const unread = notifications.filter((n) => !n.read).length

  return (
    <Screen style={{ paddingTop: insets.top + spacing.md }}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <BrandTitle
          subtitle={`Salaam, ${profile?.name?.split(" ")[0] ?? "vendor"}`}
        />

        <View style={styles.stats}>
          <Stat label="Total" value={String(jobs.length)} />
          <Stat label="Requests" value={String(pending.length)} />
          <Stat label="Active" value={String(active.length)} />
        </View>

        {unread > 0 ? (
          <Pressable onPress={() => router.push("/(vendor)/notifications")}>
            <Card>
              <Text style={styles.cardTitle}>Notifications</Text>
              <Text style={styles.cardBody}>
                {unread} unread · tap to review
              </Text>
            </Card>
          </Pressable>
        ) : (
          <Card>
            <Text style={styles.cardTitle}>Notifications</Text>
            <Text style={styles.cardBody}>You are caught up</Text>
          </Card>
        )}

        <Pressable onPress={() => router.push("/(vendor)/requests")}>
          <Card>
            <Text style={styles.cardTitle}>Requests</Text>
            <Text style={styles.cardBody}>
              {pending.length > 0
                ? `${pending.length} waiting for a reply`
                : "No pending requests"}
            </Text>
          </Card>
        </Pressable>

        <Pressable onPress={() => router.push("/(vendor)/jobs")}>
          <Card>
            <Text style={styles.cardTitle}>Jobs</Text>
            <Text style={styles.cardBody}>
              {jobs.length > 0
                ? `${jobs.length} booking${jobs.length === 1 ? "" : "s"}`
                : "No jobs yet"}
            </Text>
          </Card>
        </Pressable>

        {!profile?.vendorId ? (
          <Card>
            <Text style={styles.cardTitle}>Finish setup</Text>
            <Text style={styles.cardBody}>
              Link your vendor profile on the web app so jobs sync here.
            </Text>
            <Pressable
              onPress={() => void openWebPath("/vendor/onboarding")}
              style={{ marginTop: spacing.sm }}
            >
              <Text style={styles.link}>Open onboarding →</Text>
            </Pressable>
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  stats: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 28,
    color: colors.maroon,
  },
  statLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
  },
  cardTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
    color: colors.maroonDark,
    marginBottom: spacing.sm,
  },
  cardBody: {
    fontFamily: "DMSans_400Regular",
    color: colors.ink,
    fontSize: 15,
  },
  link: {
    fontFamily: "DMSans_500Medium",
    color: colors.maroon,
    fontSize: 15,
  },
})
