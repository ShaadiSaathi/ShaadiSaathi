"use client"

import PageTransition from "@/components/shaadi-saathi/app/PageTransition"
import { EVENTS, formatEventDate } from "@/lib/mockData"
import { useTasks } from "@/components/shaadi-saathi/tasks/TasksContext"

interface TimelineItem {
  id: string
  type: "event" | "deadline"
  date: string
  title: string
  subtitle: string
  time?: string
  eventColor?: string
}

export default function SchedulePage() {
  const { tasks } = useTasks()

  const items: TimelineItem[] = [
    ...EVENTS.map((e) => ({
      id: `event-${e.id}`,
      type: "event" as const,
      date: e.date,
      title: e.name,
      subtitle: e.venue,
      time: e.time,
      eventColor: e.color,
    })),
    ...tasks
      .filter((t) => t.status !== "done")
      .map((t) => ({
        id: `task-${t.id}`,
        type: "deadline" as const,
        date: t.dueDate,
        title: t.title,
        subtitle: t.assignee || "Unassigned",
        time: undefined,
        eventColor: undefined,
      })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Group by month
  const grouped = items.reduce<Record<string, TimelineItem[]>>((acc, item) => {
    const month = new Date(item.date).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    })
    if (!acc[month]) acc[month] = []
    acc[month].push(item)
    return acc
  }, {})

  return (
    <PageTransition>
      <header className="mb-8">
        <h1 className="font-display text-2xl font-bold text-maroon-dark sm:text-3xl">
          Schedule
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-maroon/60 sm:text-base">
          One shared timeline — events and deadlines, all in one place.
        </p>
      </header>

      <div className="relative overflow-x-hidden">
        {/* Vertical timeline line */}
        <div
          className="absolute bottom-0 left-3 top-0 w-px bg-gradient-to-b from-gold/40 via-gold/20 to-transparent md:left-6"
          aria-hidden="true"
        />

        {Object.entries(grouped).map(([month, monthItems]) => (
          <section key={month} className="mb-8 md:mb-10" aria-labelledby={`month-${month}`}>
            <h2
              id={`month-${month}`}
              className="mb-4 pl-9 font-display text-sm font-semibold uppercase tracking-wider text-maroon/50 md:mb-5 md:pl-14"
            >
              {month}
            </h2>

            <ul className="space-y-3 md:space-y-4">
              {monthItems.map((item) => (
                <li key={item.id} className="relative min-w-0 pl-9 md:pl-14">
                  {/* Timeline dot */}
                  <span
                    className={`absolute left-1.5 top-4 h-3 w-3 rounded-full border-2 border-white shadow-sm md:left-4.5 md:top-5 ${
                      item.type === "event" ? "bg-gold" : "bg-maroon/40"
                    }`}
                    aria-hidden="true"
                  />

                  <article
                    className={`rounded-2xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md md:p-5 ${
                      item.type === "event"
                        ? "border-gold/30"
                        : "border-gold/15 border-dashed"
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-start md:justify-between md:gap-2">
                      <div className="min-w-0">
                        <span
                          className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wider ${
                            item.type === "event"
                              ? "bg-gold/15 text-gold-dark"
                              : "bg-maroon/8 text-maroon/60"
                          }`}
                        >
                          {item.type === "event" ? "Event" : "Deadline"}
                        </span>
                        <h3 className="mt-2 break-words font-display text-base font-semibold text-maroon-dark md:text-lg">
                          {item.title}
                        </h3>
                        <p className="mt-0.5 break-words text-sm text-maroon/60">{item.subtitle}</p>
                      </div>
                      <div className="shrink-0 md:text-right">
                        <p className="text-sm font-medium text-maroon-dark">
                          {formatEventDate(item.date)}
                        </p>
                        {item.time && (
                          <p className="text-xs text-maroon/50">{item.time}</p>
                        )}
                      </div>
                    </div>

                    {item.type === "event" && item.eventColor && (
                      <div
                        className={`mt-3 h-1 rounded-full ${item.eventColor}`}
                        aria-hidden="true"
                      />
                    )}
                  </article>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-6 rounded-xl border border-gold/20 bg-gold/5 px-4 py-3 text-center text-sm text-maroon/60">
        Everyone in your family sees this same schedule — no more &ldquo;what time is baraat?&rdquo; texts.
      </p>
    </PageTransition>
  )
}
