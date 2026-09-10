import { FlatList, StyleSheet, Text } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  BrandTitle,
  Card,
  EmptyState,
  LoadingBlock,
  Screen,
} from "@/src/components/ui"
import { useAuth } from "@/src/context/AuthContext"
import { useVendorJobs } from "@/src/hooks/useWeddingData"
import { colors, spacing } from "@/src/lib/theme"

export default function VendorJobsScreen() {
  const insets = useSafeAreaInsets()
  const { profile } = useAuth()
  const { jobs, loading } = useVendorJobs(profile?.vendorId ?? null)

  return (
    <Screen style={{ paddingTop: insets.top + spacing.md }}>
      <BrandTitle subtitle="Your bookings" />
      {loading ? (
        <LoadingBlock />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          ListEmptyComponent={
            <EmptyState
              title="No jobs yet"
              body="When families book you, jobs show up here live."
            />
          }
          renderItem={({ item }) => (
            <Card>
              <Text style={styles.name}>
                {item.weddingName || "Wedding booking"}
              </Text>
              <Text style={styles.meta}>
                {item.status || "unknown"}
                {typeof item.price === "number"
                  ? ` · Rs ${item.price.toLocaleString()}`
                  : ""}
              </Text>
            </Card>
          )}
        />
      )}
    </Screen>
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
  },
})
