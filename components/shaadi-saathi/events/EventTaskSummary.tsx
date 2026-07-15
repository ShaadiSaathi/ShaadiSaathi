"use client"

"use client"

import Link from "next/link"
import { formatEventDate, type EventId } from "@/lib/mockData"
import { useTasks } from "@/components/shaadi-saathi/tasks/TasksContext"

interface EventTaskSummaryProps {
  eventId: EventId
  eventName: string
}

export default function EventTaskSummary({ eventId, eventName }: EventTaskSummaryProps) {
  const { tasks } = useTasks()
  const eventTasks = tasks.filter((t) => t.eventId === eventId)
  const done = eventTasks.filter((t) => t.status === "done").length
  const stats = { done, total: eventTasks.length, outstanding: eventTasks.length - done }
  const upcoming = eventTasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 3)
  const tasksUrl = `/tasks?event=${eventId}`

  return (
    <section
      aria-labelledby="event-tasks-heading"
      className="rounded-2xl border border-gold/20 bg-white p-5 shadow-sm"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="event-tasks-heading" className="font-display text-lg font-semibold text-maroon-dark">
            Tasks
          </h2>
          <p className="mt-0.5 text-sm text-maroon/60">
            {stats.done} of {stats.total} tasks done for {eventName}
          </p>
        </div>
        <Link
          href={tasksUrl}
          className="text-sm font-medium text-gold-dark hover:underline"
        >
          View all tasks →
        </Link>
      </div>

      {stats.total === 0 ? (
        <p className="text-sm text-maroon/50">No tasks tagged to this event yet.</p>
      ) : upcoming.length === 0 ? (
        <p className="text-sm text-emerald-700">All tasks for this event are complete!</p>
      ) : (
        <ul className="space-y-2" role="list">
          {upcoming.map((task) => (
            <li
              key={task.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-gold/10 bg-ivory/40 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-maroon-dark">{task.title}</p>
                <p className="text-xs text-maroon/50">
                  Due {formatEventDate(task.dueDate)} · {task.assignee || "Unassigned"}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  task.status === "in_progress"
                    ? "bg-amber-50 text-amber-800"
                    : "bg-maroon/5 text-maroon/60"
                }`}
              >
                {task.status === "in_progress" ? "In progress" : "To do"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
