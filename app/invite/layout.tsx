import { GuestsProvider } from "@/components/shaadi-saathi/guests/GuestsContext"

export default function InviteLayout({ children }: { children: React.ReactNode }) {
  return <GuestsProvider>{children}</GuestsProvider>
}
