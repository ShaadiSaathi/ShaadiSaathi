"use client"

import Link from "next/link"
import { useEffect, useId, useRef, useState } from "react"
import { useNotifications } from "@/components/shaadi-saathi/notifications/NotificationsContext"
import type { AppNotification } from "@/lib/firebase/notifications"

function relativeTime(ms: number): string {
  const diff = Date.now() - ms
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(ms).toLocaleDateString()
}

function NotificationRow({
  item,
  onSelect,
}: {
  item: AppNotification
  onSelect: (item: AppNotification) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={`w-full border-b border-gold/10 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-maroon/[0.03] ${
        item.read ? "bg-white" : "bg-maroon/[0.04]"
      }`}
    >
      <p className={`text-sm leading-snug ${item.read ? "text-maroon/70" : "font-medium text-maroon-dark"}`}>
        {item.message}
      </p>
      <p className="mt-1 text-xs text-maroon/45">{relativeTime(item.createdAt)}</p>
    </button>
  )
}

export default function NotificationBell({
  className = "",
  align = "right",
}: {
  className?: string
  align?: "left" | "right"
}) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("mousedown", onPointer)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("mousedown", onPointer)
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  const handleSelect = async (item: AppNotification) => {
    if (!item.read) {
      try {
        await markRead(item.id)
      } catch {
        // Still navigate even if mark-read fails
      }
    }
    setOpen(false)
    window.location.href = `/tasks#task-${item.taskId}`
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-maroon/70 transition-colors hover:bg-maroon/5 hover:text-maroon"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Notifications"
          className={`absolute z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-gold/20 bg-white shadow-lg shadow-maroon/10 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="flex items-center justify-between border-b border-gold/15 px-4 py-3">
            <p className="font-display text-sm font-semibold text-maroon-dark">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-xs font-medium text-maroon/60 transition-colors hover:text-maroon"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-maroon/50">
                No notifications yet. When someone assigns you a task, it will show up here.
              </p>
            ) : (
              notifications.map((item) => (
                <NotificationRow key={item.id} item={item} onSelect={(n) => void handleSelect(n)} />
              ))
            )}
          </div>

          <div className="border-t border-gold/10 px-4 py-2.5">
            <Link
              href="/tasks"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-maroon/55 transition-colors hover:text-maroon"
            >
              Open tasks
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
