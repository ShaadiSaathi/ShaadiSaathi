import WeddingInvitePage from "@/components/shaadi-saathi/guests/WeddingInvitePage"

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function InviteWeddingPage({ params }: PageProps) {
  const { token } = await params
  return <WeddingInvitePage token={token} />
}
