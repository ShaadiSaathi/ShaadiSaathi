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
import { useWedding } from "@/src/context/WeddingContext"
import { useTasks } from "@/src/hooks/useWeddingData"
import { getFirestoreDb } from "@/src/lib/firebase"
import { colors, spacing } from "@/src/lib/theme"
import type { AppTask } from "@/src/lib/types"

export default function TasksScreen() {
  const insets = useSafeAreaInsets()
  const { weddingId } = useWedding()
  const { tasks, loading, error } = useTasks(weddingId)

  async function toggle(task: AppTask) {
    const next = task.status === "done" ? "todo" : "done"
    await updateDoc(doc(getFirestoreDb(), "tasks", task.id), { status: next })
  }

  return (
    <Screen style={{ paddingTop: insets.top + spacing.md }}>
      <BrandTitle subtitle="Tap a task to mark it done" />
      <ErrorText message={error} />
      {loading ? (
        <LoadingBlock />
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          ListEmptyComponent={
            <EmptyState
              title="No tasks"
              body="Create planning tasks on the web dashboard — they'll sync here live."
            />
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => void toggle(item)}>
              <Card>
                <Text
                  style={[
                    styles.title,
                    item.status === "done" && styles.done,
                  ]}
                >
                  {item.status === "done" ? "✓ " : "○ "}
                  {item.title}
                </Text>
                <Text style={styles.meta}>
                  {item.assignee || "Unassigned"}
                  {item.dueDate ? ` · due ${item.dueDate}` : ""}
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
  title: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
    color: colors.ink,
  },
  done: {
    color: colors.muted,
    textDecorationLine: "line-through",
  },
  meta: {
    marginTop: 4,
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: colors.muted,
  },
})
