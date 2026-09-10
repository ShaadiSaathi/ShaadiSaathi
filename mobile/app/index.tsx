import { Redirect } from "expo-router"
import { useAuth } from "@/src/context/AuthContext"
import { LoadingBlock, Screen } from "@/src/components/ui"

export default function Index() {
  const { status, profile, configured } = useAuth()

  if (!configured) {
    return <Redirect href="/(auth)/login" />
  }

  if (status === "loading") {
    return (
      <Screen>
        <LoadingBlock />
      </Screen>
    )
  }

  if (status === "signedOut") {
    return <Redirect href="/(auth)/login" />
  }

  if (!profile?.name) {
    return <Redirect href="/(auth)/onboarding" />
  }

  if (profile.role === "vendor") {
    return <Redirect href="/(vendor)/dashboard" />
  }

  if (!profile.weddingId) {
    return <Redirect href="/(auth)/onboarding" />
  }

  return <Redirect href="/(family)/dashboard" />
}
