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
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import {
  markAllNotificationsRead,
  markNotificationRead,
  subscribeNotificationsForUser,
  type AppNotification,
} from "@/lib/firebase/notifications"

interface NotificationsContextValue {
  notifications: AppNotification[]
  unreadCount: number
  loading: boolean
  markRead: (notificationId: string) => Promise<void>
  markAllRead: () => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { firebaseUser, isFirebaseMode } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(isFirebaseMode)

  useEffect(() => {
    if (!isFirebaseMode || !firebaseUser?.uid) {
      setNotifications([])
      setLoading(false)
      return
    }
    setLoading(true)
    const unsub = subscribeNotificationsForUser(
      firebaseUser.uid,
      (list) => {
        setNotifications(list)
        setLoading(false)
      },
      () => setLoading(false)
    )
    return unsub
  }, [isFirebaseMode, firebaseUser?.uid])

  const markRead = useCallback(async (notificationId: string) => {
    await markNotificationRead(notificationId)
  }, [])

  const markAllRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)
    await markAllNotificationsRead(unreadIds)
  }, [notifications])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  )

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      markRead,
      markAllRead,
    }),
    [notifications, unreadCount, loading, markRead, markAllRead]
  )

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider")
  return ctx
}
