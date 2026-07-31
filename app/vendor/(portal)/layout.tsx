"use client"

import { MessagesProvider } from "@/components/shaadi-saathi/messages/MessagesContext"
import { NotificationsProvider } from "@/components/shaadi-saathi/notifications/NotificationsContext"
import VendorAppShell from "@/components/shaadi-saathi/vendor-portal/VendorAppShell"
import { VendorPortalProvider } from "@/components/shaadi-saathi/vendor-portal/VendorPortalContext"

export default function VendorPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <MessagesProvider>
      <NotificationsProvider>
        <VendorPortalProvider>
          <VendorAppShell>{children}</VendorAppShell>
        </VendorPortalProvider>
      </NotificationsProvider>
    </MessagesProvider>
  )
}
