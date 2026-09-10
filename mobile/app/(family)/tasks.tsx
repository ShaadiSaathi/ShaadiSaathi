import { useState } from "react"
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  BrandTitle,
  Card,
  EmptyState,
  ErrorText,
  Field,
  LoadingBlock,
  PrimaryButton,
  Screen,
  SecondaryButton,
} from "@/src/components/ui"
import { useWedding } from "@/src/context/WeddingContext"
import { useTasks } from "@/src/hooks/useWeddingData"
import { addTask, setTaskStatus } from "@/src/lib/mutations"
import { colors, spacing } from "@/src/lib/theme"
import type { AppTask } from "@/src/lib/types"

function isDone(task: AppTask) {
  return task.status === "done"
}

export default function TasksScreen() {
  const insets = useSafeAreaInsets()
  const { weddingId } = useWedding()
  const { tasks, loading, error } = useTasks(weddingId)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState("")
  const [assignee, setAssignee] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function toggle(task: AppTask) {
    const next = isDone(task) ? "todo" : "done"
    await setTaskStatus(task.id, next)
  }

  async function onAdd() {
    if (!weddingId || !title.trim()) {
      setFormError("Title is required")
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      await addTask({
        weddingId,
        title: title.trim(),
        assignee: assignee.trim() || undefined,
        dueDate: dueDate.trim() || undefined,
      })
      setTitle("")
      setAssignee("")
      setDueDate("")
      setShowForm(false)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not add task")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Screen style={{ paddingTop: insets.top + spacing.md }}>
      <BrandTitle subtitle="Tap a task to mark it done" />
      <ErrorText message={error} />
      <View style={styles.actions}>
        {showForm ? (
          <SecondaryButton label="Cancel" onPress={() => setShowForm(false)} />
        ) : (
          <PrimaryButton label="Add task" onPress={() => setShowForm(true)} />
        )}
      </View>

      {showForm ? (
        <Card>
          <Field
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder="What needs doing?"
          />
          <Field
            label="Assignee"
            value={assignee}
            onChangeText={setAssignee}
            placeholder="Who owns this?"
          />
          <Field
            label="Due date"
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
          />
          <ErrorText message={formError} />
          <PrimaryButton
            label="Save task"
            loading={saving}
            onPress={() => void onAdd()}
          />
        </Card>
      ) : null}

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
              body="Add planning tasks here — they'll sync with the web dashboard."
            />
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => void toggle(item)}>
              <Card>
                <Text
                  style={[styles.title, isDone(item) && styles.done]}
                >
                  {isDone(item) ? "✓ " : "○ "}
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
  actions: { marginBottom: spacing.sm },
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
