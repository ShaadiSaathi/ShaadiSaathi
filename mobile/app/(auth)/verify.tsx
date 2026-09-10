import { useLocalSearchParams, useRouter } from "expo-router"
import { useState } from "react"
import { StyleSheet, Text } from "react-native"
import {
  BrandTitle,
  ErrorText,
  Field,
  PrimaryButton,
  Screen,
  SecondaryButton,
} from "@/src/components/ui"
import { useAuth } from "@/src/context/AuthContext"
import { colors, spacing } from "@/src/lib/theme"

export default function VerifyScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{
    phone?: string
    flow?: string
    roleHint?: string
  }>()
  const { confirmOtp, sendOtp } = useAuth()
  const phone = String(params.phone ?? "")
  const flow = params.flow === "signup" ? "signup" : "login"
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onVerify() {
    setError(null)
    setLoading(true)
    try {
      await confirmOtp(phone, code, flow)
      router.replace("/")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed")
    } finally {
      setLoading(false)
    }
  }

  async function onResend() {
    setError(null)
    setLoading(true)
    try {
      await sendOtp(phone, flow)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen style={styles.screen}>
      <BrandTitle subtitle={`Enter the code sent to ${phone || "your phone"}.`} />
      <Field
        label="6-digit code"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={8}
        autoFocus
      />
      <ErrorText message={error} />
      <PrimaryButton
        label="Verify & continue"
        onPress={() => void onVerify()}
        loading={loading}
        disabled={code.trim().length < 4}
      />
      <SecondaryButton label="Resend code" onPress={() => void onResend()} />
      <SecondaryButton label="Back" onPress={() => router.back()} />
      {params.roleHint === "vendor" ? (
        <Text style={styles.note}>
          After verify, choose Vendor on the onboarding screen if this is a new account.
        </Text>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: { paddingTop: spacing.xl },
  note: {
    marginTop: spacing.md,
    fontFamily: "DMSans_400Regular",
    color: colors.muted,
    fontSize: 13,
  },
})
