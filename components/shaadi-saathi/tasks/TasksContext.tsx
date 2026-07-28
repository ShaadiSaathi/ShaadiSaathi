"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  addTaskToFirestore,
  subscribeTasksByWedding,
  updateTaskAssignee,
  updateTaskStatus,
  type AppTask,
} from "@/lib/firebase/tasks"
import { notifyTaskAssigned } from "@/lib/firebase/notifications"
import {
  TASKS as INITIAL_TASKS,
  getFamilyMember,
  type EventId,
} from "@/lib/mockData"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import { WeddingContext } from "@/components/shaadi-saathi/firebase/WeddingContext"

export type { AppTask }

interface AddTaskInput {
  title: string
  assignee: string
  assigneeUid?: string
  dueDate: string
  eventId?: EventId
  priority?: "low" | "medium" | "high"
}

interface TasksContextValue {
  tasks: AppTask[]
  loading: boolean
  addTask: (input: AddTaskInput) => void
  reassignTask: (
    taskId: string,
    input: { assignee: string; assigneeUid?: string }
  ) => Promise<void>
  toggleTaskDone: (taskId: string) => void
}

const TasksContext = createContext<TasksContextValue | null>(null)

const STORAGE_KEY = "shaadi-saathi-tasks"

/** Mock/local mode seed — mapped to the free-text `assignee` shape. */
function initialMockTasks(): AppTask[] {
  return INITIAL_TASKS.map((t) => ({
    id: t.id,
    title: t.title,
    assignee: getFamilyMember(t.assigneeId)?.name ?? "Unassigned",
    dueDate: t.dueDate,
    status: t.status,
    eventId: t.eventId,
    priority: t.priority,
  }))
}

function loadMockTasks(): AppTask[] {
  if (typeof window === "undefined") return initialMockTasks()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialMockTasks()
    const parsed = JSON.parse(raw) as AppTask[]
    return Array.isArray(parsed) ? parsed : initialMockTasks()
  } catch {
    return initialMockTasks()
  }
}

export function TasksProvider({ children }: { children: ReactNode }) {
  const {
    weddingId: authWeddingId,
    isFirebaseMode: firebaseMode,
    firebaseUser,
    familyUser,
  } = useAuth()
  const weddingCtx = useContext(WeddingContext)
  const ctxWeddingId = weddingCtx?.weddingId ?? null
  const weddingId = authWeddingId ?? ctxWeddingId
  const useFirestore = firebaseMode && Boolean(weddingId)

  const [tasks, setTasks] = useState<AppTask[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [loading, setLoading] = useState(firebaseMode)

  // Local/mock mode only.
  useEffect(() => {
    if (firebaseMode) return
    setTasks(loadMockTasks())
    setHydrated(true)
    setLoading(false)
  }, [firebaseMode])

  // Firebase mode: scope tasks to the current wedding, empty otherwise.
  useEffect(() => {
    if (!firebaseMode) return
    if (!weddingId) {
      setTasks([])
      setLoading(false)
      return
    }
    setLoading(true)
    const unsub = subscribeTasksByWedding(
      weddingId,
      (list) => {
        setTasks(list)
        setLoading(false)
      },
      () => setLoading(false)
    )
    return unsub
  }, [firebaseMode, weddingId])

  useEffect(() => {
    if (!hydrated || firebaseMode) return
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
    }
  }, [tasks, hydrated, firebaseMode])

  const addTask = useCallback(
    async (input: AddTaskInput) => {
      if (useFirestore && weddingId) {
        const taskId = await addTaskToFirestore(weddingId, input)
        const actorUid = firebaseUser?.uid
        if (input.assigneeUid && actorUid) {
          try {
            await notifyTaskAssigned({
              recipientUid: input.assigneeUid,
              weddingId,
              taskId,
              taskTitle: input.title,
              dueDate: input.dueDate,
              actorUid,
              actorName: familyUser?.name?.trim() || "Someone",
            })
          } catch (err) {
            console.error("Failed to create task assignment notification", err)
          }
        }
        return
      }
      setTasks((prev) => [
        {
          id: `task-${Date.now()}`,
          title: input.title.trim(),
          assignee: input.assignee.trim() || "Unassigned",
          assigneeUid: input.assigneeUid,
          dueDate: input.dueDate,
          status: "todo",
          eventId: input.eventId,
          priority: input.priority ?? "medium",
        },
        ...prev,
      ])
    },
    [useFirestore, weddingId, firebaseUser?.uid, familyUser?.name]
  )

  const reassignTask = useCallback(
    async (taskId: string, input: { assignee: string; assigneeUid?: string }) => {
      const task = tasks.find((t) => t.id === taskId)
      if (!task) return
      const prevUid = task.assigneeUid
      const nextUid = input.assigneeUid

      if (useFirestore && weddingId) {
        await updateTaskAssignee(taskId, {
          assignee: input.assignee,
          assigneeUid: nextUid ?? null,
        })
        const actorUid = firebaseUser?.uid
        if (nextUid && nextUid !== prevUid && actorUid) {
          try {
            await notifyTaskAssigned({
              recipientUid: nextUid,
              weddingId,
              taskId,
              taskTitle: task.title,
              dueDate: task.dueDate,
              actorUid,
              actorName: familyUser?.name?.trim() || "Someone",
            })
          } catch (err) {
            console.error("Failed to create task reassignment notification", err)
          }
        }
        return
      }

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                assignee: input.assignee.trim() || "Unassigned",
                assigneeUid: nextUid,
              }
            : t
        )
      )
    },
    [tasks, useFirestore, weddingId, firebaseUser?.uid, familyUser?.name]
  )

  const toggleTaskDone = useCallback(
    async (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId)
      if (!task) return
      const nextStatus = task.status === "done" ? "todo" : "done"
      if (useFirestore) {
        await updateTaskStatus(taskId, nextStatus)
        return
      }
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t))
      )
    },
    [tasks, useFirestore]
  )

  const value = useMemo(
    () => ({ tasks, loading, addTask, reassignTask, toggleTaskDone }),
    [tasks, loading, addTask, reassignTask, toggleTaskDone]
  )

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>
}

export function useTasks() {
  const ctx = useContext(TasksContext)
  if (!ctx) throw new Error("useTasks must be used within TasksProvider")
  return ctx
}
