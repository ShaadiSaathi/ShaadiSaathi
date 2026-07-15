import AppShell from "@/components/shaadi-saathi/app/AppShell"
import { EventDetailProvider } from "@/components/shaadi-saathi/events/EventDetailContext"
import { GuestsProvider } from "@/components/shaadi-saathi/guests/GuestsContext"
import { MessagesProvider } from "@/components/shaadi-saathi/messages/MessagesContext"
import { TasksProvider } from "@/components/shaadi-saathi/tasks/TasksContext"
import { VendorBookingsProvider } from "@/components/shaadi-saathi/vendors/VendorBookingsContext"

export default function ShaadiAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <MessagesProvider>
      <GuestsProvider>
        <TasksProvider>
          <EventDetailProvider>
            <VendorBookingsProvider>
              <AppShell>{children}</AppShell>
            </VendorBookingsProvider>
          </EventDetailProvider>
        </TasksProvider>
      </GuestsProvider>
    </MessagesProvider>
  )
}
