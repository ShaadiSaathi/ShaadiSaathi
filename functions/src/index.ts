import { initializeApp } from "firebase-admin/app"
import { getFirestore, Timestamp } from "firebase-admin/firestore"
import { logger } from "firebase-functions"
import { onRequest } from "firebase-functions/v2/https"
import { onSchedule } from "firebase-functions/v2/scheduler"

initializeApp()

const db = getFirestore()

/** Inclusive window: due today through the next 2 calendar days (≈24–48h). */
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

/**
 * Creates task_due_soon notifications for incomplete tasks due within ~48h.
 * Skips tasks that already have a due-soon notification for the same assignee.
 */
export async function runDueSoonReminders(): Promise<{
  scanned: number
  created: number
  skippedDuplicate: number
  skippedNoAssignee: number
}> {
  const dueDates = dueSoonDateStrings()
  let scanned = 0
  let created = 0
  let skippedDuplicate = 0
  let skippedNoAssignee = 0

  // Query per due date to avoid needing a composite status+dueDate index scan of all tasks.
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

/** Daily scheduled job — Asia/Karachi morning. */
export const createDueSoonReminders = onSchedule(
  {
    schedule: "0 9 * * *",
    timeZone: "Asia/Karachi",
    region: "us-central1",
  },
  async () => {
    const result = await runDueSoonReminders()
    logger.info("Due-soon reminders finished", result)
  }
)

/**
 * Manual staging trigger (GET/POST). Protected by shared secret header when
 * REMINDER_TRIGGER_SECRET is set on the function; otherwise open for staging tests.
 */
export const triggerDueSoonReminders = onRequest(
  {
    region: "us-central1",
    cors: true,
  },
  async (req, res) => {
    const secret = process.env.REMINDER_TRIGGER_SECRET
    if (secret) {
      const provided = req.get("x-reminder-secret")
      if (provided !== secret) {
        res.status(401).json({ error: "Unauthorized" })
        return
      }
    }

    try {
      const result = await runDueSoonReminders()
      res.status(200).json({ ok: true, ...result, at: Timestamp.now().toMillis() })
    } catch (err) {
      logger.error("Manual due-soon trigger failed", err)
      res.status(500).json({
        error: err instanceof Error ? err.message : "Failed to run reminders",
      })
    }
  }
)
