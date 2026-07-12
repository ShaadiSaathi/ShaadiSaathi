import AppShell from "@/components/shaadi-saathi/app/AppShell"
import { EventDetailProvider } from "@/components/shaadi-saathi/events/EventDetailContext"
import { GuestsProvider } from "@/components/shaadi-saathi/guests/GuestsContext"
import { MessagesProvider } from "@/components/shaadi-saathi/messages/MessagesContext"
import { VendorBookingsProvider } from "@/components/shaadi-saathi/vendors/VendorBookingsContext"

export default function ShaadiAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <MessagesProvider>
      <GuestsProvider>
        <EventDetailProvider>
          <VendorBookingsProvider>
            <AppShell>{children}</AppShell>
          </VendorBookingsProvider>
        </EventDetailProvider>
      </GuestsProvider>
    </MessagesProvider>
  )
}
