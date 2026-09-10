import { useRouter } from "expo-router"
import { useState } from "react"
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native"
import {
  BrandTitle,
  ErrorText,
  Field,
  PrimaryButton,
  Screen,
} from "@/src/components/ui"
import { useAuth } from "@/src/context/AuthContext"
import { colors, spacing } from "@/src/lib/theme"

export default function LoginScreen() {
  const router = useRouter()
  const { sendOtp, configured } = useAuth()
  const [phone, setPhone] = useState("+92")
  const [flow, setFlow] = useState<"login" | "signup">("login")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onContinue() {
    setError(null)
    setLoading(true)
    try {
      if (!configured) {
        throw new Error("Add EXPO_PUBLIC_FIREBASE_* and EXPO_PUBLIC_API_URL in mobile/.env")
      }
      await sendOtp(phone, flow)
      router.push({
        pathname: "/(auth)/verify",
        params: { phone, flow },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <BrandTitle subtitle="Plan the celebration together — guests, vendors, and tasks in one place." />

          <View style={styles.switchRow}>
            <Text
              onPress={() => setFlow("login")}
              style={[styles.switch, flow === "login" && styles.switchActive]}
            >
              Log in
            </Text>
            <Text
              onPress={() => setFlow("signup")}
              style={[styles.switch, flow === "signup" && styles.switchActive]}
            >
              Sign up
            </Text>
          </View>

          <Field
            label="Phone (WhatsApp)"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
          />

          <ErrorText message={error} />
          <PrimaryButton
            label={flow === "login" ? "Send login code" : "Send signup code"}
            onPress={() => void onContinue()}
            loading={loading}
          />
          <Text style={styles.hint}>
            Codes are sent via WhatsApp (Twilio). Use the same phone as on the web
            app. After verify, pick Family or Vendor on onboarding if this is a
            new account.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl, paddingTop: spacing.xl },
  switchRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  switch: {
    fontFamily: "DMSans_500Medium",
    fontSize: 16,
    color: colors.muted,
    paddingBottom: 6,
  },
  switchActive: {
    color: colors.maroon,
    borderBottomWidth: 2,
    borderBottomColor: colors.gold,
  },
  hint: {
    marginTop: spacing.lg,
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
})
