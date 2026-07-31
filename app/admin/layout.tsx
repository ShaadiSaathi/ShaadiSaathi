import type { Metadata } from "next"
import AdminGate from "@/components/shaadi-saathi/admin/AdminGate"

export const metadata: Metadata = {
  title: "Admin — Shaadi Saathi",
  robots: {
    index: false,
    follow: false,
  },
}

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AdminGate>{children}</AdminGate>
}
