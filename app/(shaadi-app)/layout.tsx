import AppShell from "@/components/shaadi-saathi/app/AppShell"
import { EventDetailProvider } from "@/components/shaadi-saathi/events/EventDetailContext"
import { GuestsProvider } from "@/components/shaadi-saathi/guests/GuestsContext"
import { MessagesProvider } from "@/components/shaadi-saathi/messages/MessagesContext"
import { NotificationsProvider } from "@/components/shaadi-saathi/notifications/NotificationsContext"
import { TasksProvider } from "@/components/shaadi-saathi/tasks/TasksContext"
import { VendorBookingsProvider } from "@/components/shaadi-saathi/vendors/VendorBookingsContext"
import { VendorsDirectoryProvider } from "@/components/shaadi-saathi/vendors/VendorsDirectoryContext"

export default function ShaadiAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <MessagesProvider>
      <GuestsProvider>
        <TasksProvider>
          <NotificationsProvider>
            <EventDetailProvider>
              <VendorsDirectoryProvider>
                <VendorBookingsProvider>
                  <AppShell>{children}</AppShell>
                </VendorBookingsProvider>
              </VendorsDirectoryProvider>
            </EventDetailProvider>
          </NotificationsProvider>
        </TasksProvider>
      </GuestsProvider>
    </MessagesProvider>
  )
}
