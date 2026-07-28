import { getAdminDb } from "@/lib/server/firebase-admin"

function dueSoonDateStrings(now = new Date()): string[] {
  const dates: string[] = []
  for (let i = 0; i <= 2; i++) {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + i)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

function formatTaskDueSoonMessage(title: string, dueDate: string): string {
  const taskTitle = title.trim() || "a task"
  return `Reminder: '${taskTitle}' is due soon (${dueDate})`
}

type TaskRow = {
  id: string
  weddingId?: string
  title?: string
  assigneeUid?: string
  dueDate?: string
  status?: string
}

export type DueSoonResult = {
  scanned: number
  created: number
  skippedDuplicate: number
  skippedNoAssignee: number
}

/**
 * Admin-only due-soon reminder runner (mirrors Cloud Function logic).
 * Used for staging tests until Firebase Functions can deploy on Blaze.
 */
export async function runDueSoonReminders(): Promise<DueSoonResult> {
  const db = getAdminDb()
  const dueDates = dueSoonDateStrings()
  let scanned = 0
  let created = 0
  let skippedDuplicate = 0
  let skippedNoAssignee = 0

  for (const dueDate of dueDates) {
    const snap = await db.collection("tasks").where("dueDate", "==", dueDate).get()
    for (const docSnap of snap.docs) {
      scanned += 1
      const task = { id: docSnap.id, ...docSnap.data() } as TaskRow
      if (task.status === "done") continue
      if (!task.assigneeUid || !task.weddingId) {
        skippedNoAssignee += 1
        continue
      }

      const existing = await db
        .collection("notifications")
        .where("taskId", "==", task.id)
        .where("recipientUid", "==", task.assigneeUid)
        .where("type", "==", "task_due_soon")
        .limit(1)
        .get()

      if (!existing.empty) {
        skippedDuplicate += 1
        continue
      }

      const ref = db.collection("notifications").doc()
      await ref.set({
        id: ref.id,
        recipientUid: task.assigneeUid,
        weddingId: task.weddingId,
        type: "task_due_soon",
        message: formatTaskDueSoonMessage(task.title ?? "a task", dueDate),
        taskId: task.id,
        read: false,
        createdAt: Date.now(),
        actorName: "Shaadi Saathi",
      })
      created += 1
    }
  }

  return { scanned, created, skippedDuplicate, skippedNoAssignee }
}
