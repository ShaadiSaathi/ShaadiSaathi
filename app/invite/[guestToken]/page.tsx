import GuestInvitePage from "@/components/shaadi-saathi/guests/GuestInvitePage"

interface PageProps {
  params: Promise<{ guestToken: string }>
}

export default async function InviteGuestPage({ params }: PageProps) {
  const { guestToken } = await params
  return <GuestInvitePage guestToken={guestToken} />
}
