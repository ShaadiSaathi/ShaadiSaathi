import { useRouter } from "expo-router"
import { useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import {
  BrandTitle,
  ErrorText,
  Field,
  PrimaryButton,
  Screen,
} from "@/src/components/ui"
import { useAuth } from "@/src/context/AuthContext"
import { useWedding } from "@/src/context/WeddingContext"
import { colors, spacing } from "@/src/lib/theme"
import type { UserRole } from "@/src/lib/types"

export default function OnboardingScreen() {
  const router = useRouter()
  const { profile, user, ensureProfile } = useAuth()
  const { createWedding } = useWedding()
  const [role, setRole] = useState<UserRole>(profile?.role ?? "family")
  const [name, setName] = useState(profile?.name ?? "")
  const [phone, setPhone] = useState(profile?.phone ?? "")
  const [weddingName, setWeddingName] = useState("")
  const [firstEventDate, setFirstEventDate] = useState("2026-12-01")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onFinish() {
    if (!user) {
      setError("Sign in first")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const next = await ensureProfile({ name, role, phone })
      if (role === "family" && !next.weddingId) {
        await createWedding({
          name: weddingName || `${name}'s wedding`,
          organiserName: name,
          organiserPhone: phone,
          firstEventDate,
        })
      }
      router.replace("/")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not finish setup")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen style={styles.screen}>
      <BrandTitle subtitle="Tell us who you are so we can open the right home." />

      <View style={styles.roleRow}>
        {(["family", "vendor"] as const).map((r) => (
          <Text
            key={r}
            onPress={() => setRole(r)}
            style={[styles.role, role === r && styles.roleActive]}
          >
            {r === "family" ? "Family" : "Vendor"}
          </Text>
        ))}
      </View>

      <Field label="Your name" value={name} onChangeText={setName} />
      <Field
        label="Phone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      {role === "family" && !profile?.weddingId ? (
        <>
          <Field
            label="Wedding name"
            value={weddingName}
            onChangeText={setWeddingName}
            placeholder="Aisha & Omar"
          />
          <Field
            label="First event date (YYYY-MM-DD)"
            value={firstEventDate}
            onChangeText={setFirstEventDate}
          />
        </>
      ) : null}

      <ErrorText message={error} />
      <PrimaryButton
        label="Continue"
        onPress={() => void onFinish()}
        loading={loading}
        disabled={!name.trim() || !phone.trim()}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: { paddingTop: spacing.xl },
  roleRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  role: {
    flex: 1,
    textAlign: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    fontFamily: "DMSans_500Medium",
    color: colors.muted,
    overflow: "hidden",
  },
  roleActive: {
    backgroundColor: colors.maroon,
    borderColor: colors.maroon,
    color: colors.white,
  },
})
