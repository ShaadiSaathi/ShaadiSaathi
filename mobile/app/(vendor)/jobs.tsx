import { FlatList, Pressable, StyleSheet, Text } from "react-native"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  BrandTitle,
  Card,
  EmptyState,
  ErrorText,
  LoadingBlock,
  Screen,
} from "@/src/components/ui"
import { useAuth } from "@/src/context/AuthContext"
import { useVendorJobs } from "@/src/hooks/useWeddingData"
import { eventLabel } from "@/src/lib/events"
import { colors, spacing } from "@/src/lib/theme"

export default function VendorJobsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { profile } = useAuth()
  const { jobs, loading, error } = useVendorJobs(profile?.vendorId ?? null)

  return (
    <Screen style={{ paddingTop: insets.top + spacing.md }}>
      <BrandTitle subtitle="Your bookings" />
      <ErrorText message={error} />
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
            <Pressable
              onPress={() => router.push(`/(vendor)/job/${item.id}`)}
            >
              <Card>
                <Text style={styles.name}>
                  {item.weddingName || item.familyName || "Wedding booking"}
                </Text>
                <Text style={styles.meta}>
                  {item.status}
                  {" · "}
                  {eventLabel(
                    typeof item.eventId === "string" ? item.eventId : undefined
                  )}
                  {item.eventDate ? ` · ${item.eventDate}` : ""}
                </Text>
                <Text style={styles.price}>
                  Rs {item.price.toLocaleString("en-PK")}
                  {item.packageName ? ` · ${item.packageName}` : ""}
                </Text>
              </Card>
            </Pressable>
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
    textTransform: "capitalize",
  },
  price: {
    marginTop: 8,
    fontFamily: "DMSans_500Medium",
    fontSize: 15,
    color: colors.maroon,
  },
})
