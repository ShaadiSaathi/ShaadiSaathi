import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore"
import type { EventId } from "@/lib/mockData"
import { getFirestoreDb } from "./config"
import type { FirestoreTask, TaskStatusValue } from "./types"

export interface AppTask {
  id: string
  title: string
  assignee: string
  assigneeUid?: string
  dueDate: string
  status: TaskStatusValue
  eventId?: EventId
  priority?: "low" | "medium" | "high"
}

function toAppTask(data: FirestoreTask): AppTask {
  return {
    id: data.id,
    title: data.title,
    assignee: data.assignee,
    assigneeUid: data.assigneeUid,
    dueDate: data.dueDate,
    status: data.status,
    eventId: data.eventId,
    priority: data.priority,
  }
}

export function subscribeTasksByWedding(
  weddingId: string,
  onData: (tasks: AppTask[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(collection(getFirestoreDb(), "tasks"), where("weddingId", "==", weddingId))
  return onSnapshot(
    q,
    (snap) => {
      const tasks = snap.docs.map((d) => toAppTask({ id: d.id, ...d.data() } as FirestoreTask))
      tasks.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      onData(tasks)
    },
    (err) => onError?.(err)
  )
}

export async function addTaskToFirestore(
  weddingId: string,
  input: {
    title: string
    assignee: string
    assigneeUid?: string
    dueDate: string
    eventId?: EventId
    priority?: "low" | "medium" | "high"
  }
): Promise<string> {
  const ref = doc(collection(getFirestoreDb(), "tasks"))
  const task: FirestoreTask = {
    id: ref.id,
    weddingId,
    title: input.title.trim(),
    assignee: input.assignee.trim(),
    dueDate: input.dueDate,
    status: "todo",
    priority: input.priority ?? "medium",
    createdAt: Date.now(),
    ...(input.assigneeUid ? { assigneeUid: input.assigneeUid } : {}),
    ...(input.eventId ? { eventId: input.eventId } : {}),
  }
  await setDoc(ref, task)
  return ref.id
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatusValue
): Promise<void> {
  await updateDoc(doc(getFirestoreDb(), "tasks", taskId), { status })
}

/** Reassign a task to a wedding member (or clear assigneeUid). */
export async function updateTaskAssignee(
  taskId: string,
  input: { assignee: string; assigneeUid?: string | null }
): Promise<void> {
  const payload: { assignee: string; assigneeUid?: string | null } = {
    assignee: input.assignee.trim(),
  }
  if (input.assigneeUid) {
    payload.assigneeUid = input.assigneeUid
  } else {
    payload.assigneeUid = null
  }
  await updateDoc(doc(getFirestoreDb(), "tasks", taskId), payload)
}

export async function deleteTaskFromFirestore(taskId: string): Promise<void> {
  await deleteDoc(doc(getFirestoreDb(), "tasks", taskId))
}
