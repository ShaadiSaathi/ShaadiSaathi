import type { Metadata } from "next"
import { Playfair_Display, DM_Sans } from "next/font/google"
import { AuthProvider } from "@/components/shaadi-saathi/auth/AuthContext"
import { WeddingProvider } from "@/components/shaadi-saathi/firebase/WeddingContext"
import { PremiumProvider } from "@/components/shaadi-saathi/premium/PremiumContext"
import "./globals.css"

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
})

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Shaadi Saathi — Every Event. Every Guest. One Place.",
  description:
    "Plan your mehndi, baraat, and walima in one shared space. Guest lists, RSVPs, tasks, and schedules — without the WhatsApp chaos.",
  openGraph: {
    title: "Shaadi Saathi — Wedding Planning for South Asian Families",
    description:
      "Replace scattered WhatsApp groups and paper lists with one organized planning space for your multi-event wedding.",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${dmSans.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full font-sans">
        <AuthProvider>
          <WeddingProvider>
            <PremiumProvider>{children}</PremiumProvider>
          </WeddingProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
