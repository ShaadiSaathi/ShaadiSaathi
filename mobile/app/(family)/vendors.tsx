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
import { useVendors } from "@/src/hooks/useWeddingData"
import { colors, spacing } from "@/src/lib/theme"

export default function VendorsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { vendors, loading, error } = useVendors()

  return (
    <Screen style={{ paddingTop: insets.top + spacing.md }}>
      <BrandTitle subtitle="Browse verified vendors" />
      <ErrorText message={error} />
      {loading ? (
        <LoadingBlock />
      ) : (
        <FlatList
          data={vendors}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          ListEmptyComponent={
            <EmptyState
              title="No vendors yet"
              body="Vendor listings will appear here once published."
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/(family)/vendor/${item.id}`)}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Card>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>
                  {[item.category, item.city].filter(Boolean).join(" · ") ||
                    "Vendor"}
                </Text>
                {typeof item.startingPrice === "number" &&
                item.startingPrice > 0 ? (
                  <Text style={styles.price}>
                    From Rs {item.startingPrice.toLocaleString("en-PK")}
                  </Text>
                ) : null}
                {typeof item.rating === "number" && item.rating > 0 ? (
                  <Text style={styles.meta}>★ {item.rating.toFixed(1)}</Text>
                ) : null}
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },
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
  price: {
    marginTop: 8,
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
    color: colors.maroon,
  },
})
