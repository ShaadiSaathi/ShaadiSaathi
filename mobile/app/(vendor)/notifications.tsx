import { FlatList, Pressable, StyleSheet, Text } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { doc, updateDoc } from "firebase/firestore"
import {
  BrandTitle,
  Card,
  EmptyState,
  ErrorText,
  LoadingBlock,
  Screen,
} from "@/src/components/ui"
import { useAuth } from "@/src/context/AuthContext"
import { useNotifications } from "@/src/hooks/useWeddingData"
import { getFirestoreDb } from "@/src/lib/firebase"
import { colors, spacing } from "@/src/lib/theme"

export default function VendorNotificationsScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const { notifications, loading, error } = useNotifications(user?.uid ?? null)

  return (
    <Screen style={{ paddingTop: insets.top + spacing.md }}>
      <BrandTitle subtitle="Job and quote alerts" />
      <ErrorText message={error} />
      {loading ? (
        <LoadingBlock />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          ListEmptyComponent={
            <EmptyState
              title="No alerts"
              body="Booking requests and quote updates will appear here."
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                if (!item.read) {
                  void updateDoc(
                    doc(getFirestoreDb(), "notifications", item.id),
                    { read: true }
                  )
                }
              }}
            >
              <Card>
                <Text style={[styles.message, !item.read && styles.unread]}>
                  {item.message}
                </Text>
                <Text style={styles.meta}>
                  {item.type.replace(/_/g, " ")}
                  {item.createdAt
                    ? ` · ${new Date(item.createdAt).toLocaleString()}`
                    : ""}
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
  message: {
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    color: colors.ink,
    lineHeight: 22,
  },
  unread: { fontFamily: "DMSans_700Bold" },
  meta: {
    marginTop: 6,
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: colors.muted,
    textTransform: "capitalize",
  },
})
