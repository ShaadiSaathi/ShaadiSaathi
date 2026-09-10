import { FlatList, Pressable, StyleSheet, Text } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { doc, updateDoc } from "firebase/firestore"
import {
  BrandTitle,
  Card,
  EmptyState,
  ErrorText,
  LoadingBlock,
  PrimaryButton,
  Screen,
} from "@/src/components/ui"
import { useAuth } from "@/src/context/AuthContext"
import { useNotifications } from "@/src/hooks/useWeddingData"
import { getFirestoreDb } from "@/src/lib/firebase"
import { colors, spacing } from "@/src/lib/theme"
import type { AppNotification } from "@/src/lib/types"

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const { notifications, loading, error } = useNotifications(user?.uid ?? null)
  const unread = notifications.filter((n) => !n.read)

  async function markRead(item: AppNotification) {
    if (item.read) return
    await updateDoc(doc(getFirestoreDb(), "notifications", item.id), {
      read: true,
    })
  }

  async function markAllRead() {
    await Promise.all(
      unread.map((n) =>
        updateDoc(doc(getFirestoreDb(), "notifications", n.id), { read: true })
      )
    )
  }

  return (
    <Screen style={{ paddingTop: insets.top + spacing.md }}>
      <BrandTitle
        subtitle={
          unread.length > 0
            ? `${unread.length} unread`
            : "You're caught up"
        }
      />
      {unread.length > 0 ? (
        <PrimaryButton label="Mark all read" onPress={() => void markAllRead()} />
      ) : null}
      <ErrorText message={error} />
      {loading ? (
        <LoadingBlock />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: spacing.xl, marginTop: spacing.sm }}
          ListEmptyComponent={
            <EmptyState
              title="No notifications"
              body="Task and booking alerts from the wedding will show up here."
            />
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => void markRead(item)}>
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
  unread: {
    fontFamily: "DMSans_700Bold",
  },
  meta: {
    marginTop: 6,
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: colors.muted,
    textTransform: "capitalize",
  },
})
