import { useMemo } from "react"
import { FlatList, Pressable, StyleSheet, Text } from "react-native"
import { useRouter, type Href } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  BrandTitle,
  Card,
  EmptyState,
  LoadingBlock,
  Screen,
} from "@/src/components/ui"
import { useWedding } from "@/src/context/WeddingContext"
import { useTasks } from "@/src/hooks/useWeddingData"
import { WEDDING_EVENTS } from "@/src/lib/events"
import { colors, spacing } from "@/src/lib/theme"

type TimelineItem = {
  key: string
  kind: "event" | "task"
  title: string
  subtitle: string
  date: string
  href?: Href
}

export default function ScheduleScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { wedding, weddingId, loading: weddingLoading } = useWedding()
  const { tasks, loading: tasksLoading } = useTasks(weddingId)
  const overrides = wedding?.eventOverrides ?? {}

  const items = useMemo(() => {
    const rows: TimelineItem[] = []

    for (const event of WEDDING_EVENTS) {
      const override = overrides[event.id]
      const date = override?.date || wedding?.firstEventDate || ""
      const time = override?.time || event.defaultTime
      rows.push({
        key: `event-${event.id}`,
        kind: "event",
        title: event.name,
        subtitle: `${time} · ${event.venueHint}`,
        date: date || "9999-12-31",
        href: `/(family)/event/${event.id}` as Href,
      })
    }

    for (const task of tasks) {
      if (task.status === "done") continue
      rows.push({
        key: `task-${task.id}`,
        kind: "task",
        title: task.title,
        subtitle: `${task.assignee || "Unassigned"}${task.dueDate ? ` · due ${task.dueDate}` : ""}`,
        date: task.dueDate || "9999-12-31",
      })
    }

    rows.sort((a, b) => a.date.localeCompare(b.date))
    return rows
  }, [overrides, wedding?.firstEventDate, tasks])

  const loading = weddingLoading || tasksLoading

  return (
    <Screen style={{ paddingTop: insets.top + spacing.md }}>
      <BrandTitle subtitle="Events & open tasks" />
      {loading ? (
        <LoadingBlock />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          ListEmptyComponent={
            <EmptyState
              title="Nothing scheduled"
              body="Events and open tasks will appear here as a timeline."
            />
          }
          renderItem={({ item }) => {
            const content = (
              <Card>
                <Text style={styles.kind}>
                  {item.kind === "event" ? "Event" : "Task"}
                </Text>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.meta}>
                  {item.date === "9999-12-31" ? "Date TBD" : item.date}
                  {" · "}
                  {item.subtitle}
                </Text>
              </Card>
            )
            if (item.href) {
              return (
                <Pressable
                  onPress={() => router.push(item.href as Href)}
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  {content}
                </Pressable>
              )
            }
            return content
          }}
        />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },
  kind: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    color: colors.goldDark,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  title: {
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
