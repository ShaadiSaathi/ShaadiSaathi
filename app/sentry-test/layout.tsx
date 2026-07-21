import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sentry Test — Shaadi Saathi",
  robots: {
    index: false,
    follow: false,
  },
}

export default function SentryTestLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children
}
