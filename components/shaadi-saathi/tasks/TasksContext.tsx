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
  TASKS as INITIAL_TASKS,
  getFamilyMember,
  type EventId,
} from "@/lib/mockData"
import { isFirebaseConfigured } from "@/lib/firebase/config"
import {
  addTaskToFirestore,
  subscribeTasksByWedding,
  updateTaskStatus,
  type AppTask,
} from "@/lib/firebase/tasks"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import { WeddingContext } from "@/components/shaadi-saathi/firebase/WeddingContext"

export type { AppTask }

interface AddTaskInput {
  title: string
  assignee: string
  dueDate: string
  eventId?: EventId
  priority?: "low" | "medium" | "high"
}

interface TasksContextValue {
  tasks: AppTask[]
  loading: boolean
  addTask: (input: AddTaskInput) => void
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
  const { weddingId: authWeddingId } = useAuth()
  const weddingCtx = useContext(WeddingContext)
  const ctxWeddingId = weddingCtx?.weddingId ?? null
  const firebaseMode = isFirebaseConfigured()
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
        await addTaskToFirestore(weddingId, input)
        return
      }
      setTasks((prev) => [
        {
          id: `task-${Date.now()}`,
          title: input.title.trim(),
          assignee: input.assignee.trim() || "Unassigned",
          dueDate: input.dueDate,
          status: "todo",
          eventId: input.eventId,
          priority: input.priority ?? "medium",
        },
        ...prev,
      ])
    },
    [useFirestore, weddingId]
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
    () => ({ tasks, loading, addTask, toggleTaskDone }),
    [tasks, loading, addTask, toggleTaskDone]
  )

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>
}

export function useTasks() {
  const ctx = useContext(TasksContext)
  if (!ctx) throw new Error("useTasks must be used within TasksProvider")
  return ctx
}
