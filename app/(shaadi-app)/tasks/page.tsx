"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import Link from "next/link"
import { Suspense, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import Avatar from "@/components/shaadi-saathi/app/Avatar"
import EmptyState from "@/components/shaadi-saathi/app/EmptyState"
import EventChip from "@/components/shaadi-saathi/app/EventChip"
import GoldButton from "@/components/shaadi-saathi/app/GoldButton"
import PageTransition from "@/components/shaadi-saathi/app/PageTransition"
import { EVENTS, type EventId, type TaskStatus } from "@/lib/mockData"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import { useWeddingMembersOptional } from "@/components/shaadi-saathi/family/WeddingMembersContext"
import { useTasks, type AppTask } from "@/components/shaadi-saathi/tasks/TasksContext"

type GroupBy = "status" | "assignee"

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
}

const STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "done"]

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-maroon/50">
          Loading tasks…
        </div>
      }
    >
      <TasksPageContent />
    </Suspense>
  )
}

function TasksPageContent() {
  const searchParams = useSearchParams()
  const eventParam = searchParams.get("event")
  const eventFilter = EVENTS.find((e) => e.id === eventParam)?.id as EventId | undefined

  const { tasks, addTask, reassignTask, toggleTaskDone } = useTasks()
  const { familyUser, isFirebaseMode, firebaseUser } = useAuth()
  const weddingMembers = useWeddingMembersOptional()
  const [groupBy, setGroupBy] = useState<GroupBy>("status")
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newAssigneeUid, setNewAssigneeUid] = useState("")
  const [newDueDate, setNewDueDate] = useState("")
  const [newEvent, setNewEvent] = useState<EventId | "">("")

  const assignableMembers = weddingMembers?.members ?? []
  const formatAssignee = weddingMembers?.formatAssigneeLabel ?? ((a: string) => a)

  function handleAddTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return

    const selected = assignableMembers.find((m) => m.uid === newAssigneeUid)
    const fallbackName = familyUser?.name ?? "Unassigned"

    addTask({
      title: newTitle.trim(),
      assignee: selected?.name ?? fallbackName,
      assigneeUid: selected?.uid,
      dueDate: newDueDate || new Date().toISOString().slice(0, 10),
      eventId: newEvent || undefined,
      priority: "medium",
    })
    setNewTitle("")
    setNewAssigneeUid("")
    setNewDueDate("")
    setShowAddForm(false)
  }

  const displayedTasks = useMemo(
    () => (eventFilter ? tasks.filter((t) => t.eventId === eventFilter) : tasks),
    [tasks, eventFilter]
  )

  const activeTasks = displayedTasks.filter((t) => t.status !== "done")

  const assigneeGroups = useMemo(() => {
    const keys = new Map<string, string>()
    for (const t of displayedTasks) {
      const key = t.assigneeUid ?? t.assignee
      const label = formatAssignee(t.assignee, t.assigneeUid)
      keys.set(key, label)
    }
    return Array.from(keys.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [displayedTasks, formatAssignee])

  return (
    <PageTransition>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-maroon-dark sm:text-3xl">
            Tasks
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-maroon/60 sm:text-base">
            Assign, track, and celebrate what gets done.
          </p>
        </div>
        <GoldButton
          onClick={() => {
            setShowAddForm(true)
            const selfUid =
              firebaseUser?.uid ??
              assignableMembers.find((m) => m.name === familyUser?.name)?.uid ??
              assignableMembers[0]?.uid ??
              ""
            setNewAssigneeUid(selfUid)
          }}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Task
        </GoldButton>
      </header>

      {eventFilter && (
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-gold/20 bg-gold/5 px-4 py-3">
          <span className="text-sm text-maroon/70">Showing tasks for</span>
          <EventChip eventId={eventFilter} size="sm" />
          <Link href="/tasks" className="ml-auto inline-flex min-h-[44px] items-center text-xs font-medium text-maroon/50 hover:text-maroon">
            Show all tasks
          </Link>
        </div>
      )}

      <div className="mb-6 flex gap-1 rounded-xl border border-gold/20 bg-white p-1">
        {(["status", "assignee"] as const).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGroupBy(g)}
            className={`flex min-h-[44px] flex-1 items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              groupBy === g ? "bg-maroon text-ivory" : "text-maroon/60 hover:text-maroon"
            }`}
          >
            Group by {g === "status" ? "Status" : "Person"}
          </button>
        ))}
      </div>

      {displayedTasks.length === 0 ? (
        <EmptyState
          icon={
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          title="No tasks yet"
          description="Add your first task to get the family organized — book the dholki, confirm the caterer, you name it."
          action={<GoldButton onClick={() => setShowAddForm(true)}>Add Task</GoldButton>}
        />
      ) : groupBy === "status" ? (
        <div className="space-y-8">
          {STATUS_ORDER.map((status) => {
            const group = displayedTasks.filter((t) => t.status === status)
            if (group.length === 0) return null
            return (
              <section key={status} aria-labelledby={`status-${status}`}>
                <h2
                  id={`status-${status}`}
                  className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-maroon/50"
                >
                  {STATUS_LABELS[status]} ({group.length})
                </h2>
                <ul className="space-y-2">
                  {group.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      assigneeLabel={formatAssignee(task.assignee, task.assigneeUid)}
                      assignableMembers={assignableMembers}
                      onReassign={
                        isFirebaseMode
                          ? (uid) => {
                              const member = assignableMembers.find((m) => m.uid === uid)
                              if (!member) return
                              void reassignTask(task.id, {
                                assignee: member.name,
                                assigneeUid: member.uid,
                              })
                            }
                          : undefined
                      }
                      onToggle={() => toggleTaskDone(task.id)}
                    />
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      ) : (
        <div className="space-y-8">
          {assigneeGroups.map(({ key, label }) => {
            const group = displayedTasks.filter(
              (t) => (t.assigneeUid ?? t.assignee) === key
            )
            if (group.length === 0) return null
            return (
              <section key={key} aria-labelledby={`member-${key}`}>
                <div id={`member-${key}`} className="mb-3 flex items-center gap-2">
                  <Avatar initials={initialsOf(label)} size="sm" />
                  <h2 className="font-display text-sm font-semibold text-maroon-dark">
                    {label}
                  </h2>
                  <span className="text-xs text-maroon/40">({group.length})</span>
                </div>
                <ul className="space-y-2">
                  {group.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      assigneeLabel={formatAssignee(task.assignee, task.assigneeUid)}
                      assignableMembers={assignableMembers}
                      onReassign={
                        isFirebaseMode
                          ? (uid) => {
                              const member = assignableMembers.find((m) => m.uid === uid)
                              if (!member) return
                              void reassignTask(task.id, {
                                assignee: member.name,
                                assigneeUid: member.uid,
                              })
                            }
                          : undefined
                      }
                      onToggle={() => toggleTaskDone(task.id)}
                    />
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}

      {activeTasks.length > 0 && (
        <p className="mt-8 text-center text-sm text-maroon/50">
          {activeTasks.length} task{activeTasks.length !== 1 ? "s" : ""} still to go — you&apos;ve got this.
        </p>
      )}

      {showAddForm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-maroon-dark/40 md:items-center md:p-4"
          role="dialog"
          aria-labelledby="add-task-title"
          aria-modal="true"
        >
          <div className="safe-bottom flex max-h-[96dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-gold/25 bg-ivory shadow-xl md:max-h-[90vh] md:max-w-md md:rounded-2xl">
            <div className="flex shrink-0 justify-center pt-2.5 pb-1 md:hidden" aria-hidden="true">
              <span className="h-1.5 w-10 rounded-full bg-maroon/15" />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
              <h2 id="add-task-title" className="font-display text-xl font-semibold text-maroon-dark">
                Add Task
              </h2>
              <form onSubmit={handleAddTask} className="mt-4 space-y-4">
                <div>
                  <label htmlFor="task-title" className="block text-sm font-medium text-maroon/70">
                    Task
                  </label>
                  <input
                    id="task-title"
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="mt-1 min-h-[44px] w-full rounded-xl border border-gold/20 bg-white px-4 py-2.5 text-sm focus:border-maroon/30 focus:outline-none focus:ring-2 focus:ring-maroon/10"
                    placeholder="e.g. Confirm florist"
                  />
                </div>
                <div>
                  <label htmlFor="task-assignee" className="block text-sm font-medium text-maroon/70">
                    Assign to
                  </label>
                  {isFirebaseMode && assignableMembers.length > 0 ? (
                    <>
                      <select
                        id="task-assignee"
                        value={newAssigneeUid}
                        onChange={(e) => setNewAssigneeUid(e.target.value)}
                        className="mt-1 min-h-[44px] w-full rounded-xl border border-gold/20 bg-white px-4 py-2.5 text-sm focus:border-maroon/30 focus:outline-none focus:ring-2 focus:ring-maroon/10"
                      >
                        <option value="">Select a family member</option>
                        {assignableMembers.map((m) => (
                          <option key={m.uid} value={m.uid}>
                            {m.name}
                            {m.role === "owner" ? " (you)" : ""}
                          </option>
                        ))}
                      </select>
                      {assignableMembers.length <= 1 && (
                        <p className="mt-2 text-xs text-maroon/50">
                          Invite family members from{" "}
                          <Link href="/settings" className="font-semibold text-maroon hover:text-gold-dark">
                            Settings
                          </Link>{" "}
                          to assign tasks to them.
                        </p>
                      )}
                    </>
                  ) : (
                    <select
                      id="task-assignee"
                      value={newAssigneeUid}
                      onChange={(e) => setNewAssigneeUid(e.target.value)}
                      className="mt-1 min-h-[44px] w-full rounded-xl border border-gold/20 bg-white px-4 py-2.5 text-sm"
                    >
                      <option value="">{familyUser?.name ?? "Unassigned"}</option>
                    </select>
                  )}
                </div>
                <div>
                  <label htmlFor="task-due" className="block text-sm font-medium text-maroon/70">
                    Due date
                  </label>
                  <input
                    id="task-due"
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="mt-1 min-h-[44px] w-full rounded-xl border border-gold/20 bg-white px-4 py-2.5 text-sm focus:border-maroon/30 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="task-event" className="block text-sm font-medium text-maroon/70">
                    Event (optional)
                  </label>
                  <select
                    id="task-event"
                    value={newEvent}
                    onChange={(e) => setNewEvent(e.target.value as EventId | "")}
                    className="mt-1 min-h-[44px] w-full rounded-xl border border-gold/20 bg-white px-4 py-2.5 text-sm focus:border-maroon/30 focus:outline-none"
                  >
                    <option value="">No specific event</option>
                    {EVENTS.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <GoldButton type="submit" className="min-h-[44px] flex-1">
                    Add Task
                  </GoldButton>
                  <GoldButton
                    type="button"
                    variant="ghost"
                    onClick={() => setShowAddForm(false)}
                    className="min-h-[44px] flex-1"
                  >
                    Cancel
                  </GoldButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </PageTransition>
  )
}

function initialsOf(name: string): string {
  return (
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  )
}

function TaskCard({
  task,
  assigneeLabel,
  assignableMembers = [],
  onReassign,
  onToggle,
}: {
  task: AppTask
  assigneeLabel: string
  assignableMembers?: Array<{ uid: string; name: string; role: string }>
  onReassign?: (uid: string) => void
  onToggle: () => void
}) {
  const prefersReducedMotion = useReducedMotion()
  const isDone = task.status === "done"

  return (
    <li id={`task-${task.id}`} className="scroll-mt-24 overflow-hidden rounded-xl border border-gold/15 bg-white">
      <AnimatePresence mode="wait">
        <motion.div
          layout
          initial={false}
          animate={{
            opacity: isDone ? 0.65 : 1,
          }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
          className="flex items-center gap-2 px-3 py-3 md:items-start md:gap-3 md:px-4 md:py-4"
        >
          <button
            type="button"
            onClick={onToggle}
            aria-label={isDone ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
            className="flex h-11 w-11 shrink-0 items-center justify-center md:mt-0.5 md:h-5 md:w-5"
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors md:h-5 md:w-5 ${
                isDone
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-maroon/30 hover:border-maroon"
              }`}
            >
              {isDone && (
                <motion.svg
                  initial={prefersReducedMotion ? false : { scale: 0 }}
                  animate={{ scale: 1 }}
                  className="h-3.5 w-3.5 md:h-3 md:w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </motion.svg>
              )}
            </span>
          </button>

          <div className="min-w-0 flex-1">
            <motion.p
              animate={{
                textDecoration: isDone ? "line-through" : "none",
                color: isDone ? "rgba(74, 18, 53, 0.45)" : "rgba(74, 18, 53, 1)",
              }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.35 }}
              className="text-sm font-medium leading-snug text-maroon-dark md:text-base"
            >
              {task.title}
            </motion.p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-maroon/50">
              {onReassign && assignableMembers.length > 0 ? (
                <label className="flex max-w-[55%] items-center gap-1 truncate md:max-w-none">
                  <span className="sr-only">Reassign task</span>
                  <Avatar
                    initials={initialsOf(assigneeLabel.replace(/\s*\(unlinked\)$/i, ""))}
                    size="sm"
                    className="!h-4 !w-4 !text-[9px] md:!h-5 md:!w-5 md:!text-[10px]"
                  />
                  <select
                    value={task.assigneeUid ?? ""}
                    onChange={(e) => {
                      const uid = e.target.value
                      if (uid && uid !== task.assigneeUid) onReassign(uid)
                    }}
                    className="max-w-[9rem] truncate rounded-md border-0 bg-transparent py-0.5 text-xs text-maroon/60 focus:outline-none focus:ring-1 focus:ring-maroon/20 md:max-w-[12rem]"
                    aria-label={`Assignee for ${task.title}`}
                  >
                    {!task.assigneeUid && <option value="">{assigneeLabel}</option>}
                    {assignableMembers.map((m) => (
                      <option key={m.uid} value={m.uid}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                assigneeLabel && (
                  <span className="flex max-w-[42%] items-center gap-1 truncate md:max-w-none">
                    <Avatar
                      initials={initialsOf(assigneeLabel.replace(/\s*\(unlinked\)$/i, ""))}
                      size="sm"
                      className="!h-4 !w-4 !text-[9px] md:!h-5 md:!w-5 md:!text-[10px]"
                    />
                    <span className="truncate">{assigneeLabel}</span>
                  </span>
                )
              )}
              <span aria-hidden="true">·</span>
              <span className="shrink-0">
                Due{" "}
                {new Date(task.dueDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
              {task.eventId && (
                <>
                  <span className="hidden md:inline" aria-hidden="true">
                    ·
                  </span>
                  <span className="basis-full md:basis-auto">
                    <EventChip eventId={task.eventId} />
                  </span>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </li>
  )
}
