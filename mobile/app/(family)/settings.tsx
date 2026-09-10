import { useState } from "react"
import { ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  BrandTitle,
  Card,
  ErrorText,
  Field,
  PrimaryButton,
  Screen,
  SecondaryButton,
} from "@/src/components/ui"
import { useAuth } from "@/src/context/AuthContext"
import { useWedding } from "@/src/context/WeddingContext"
import { getApiBaseUrl, getAppEnv } from "@/src/lib/firebase"
import { inviteCollaborator } from "@/src/lib/mutations"
import { colors, spacing } from "@/src/lib/theme"
import { openWebPath } from "@/src/lib/web"

export default function SettingsScreen() {
  const insets = useSafeAreaInsets()
  const { profile, signOut } = useAuth()
  const { wedding, weddingId } = useWedding()
  const [phone, setPhone] = useState("")
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteOk, setInviteOk] = useState(false)

  const env = getAppEnv()
  let apiUrl = "—"
  try {
    apiUrl = getApiBaseUrl()
  } catch {
    apiUrl = "not set"
  }

  async function onInvite() {
    if (!weddingId || !profile) {
      setInviteError("Wedding not ready")
      return
    }
    if (!phone.trim()) {
      setInviteError("Phone is required")
      return
    }
    setInviting(true)
    setInviteError(null)
    setInviteOk(false)
    try {
      await inviteCollaborator({
        weddingId,
        phone: phone.trim(),
        invitedByName: profile.name,
      })
      setPhone("")
      setInviteOk(true)
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : "Invite failed")
    } finally {
      setInviting(false)
    }
  }

  return (
    <Screen style={{ paddingTop: insets.top + spacing.md }}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <BrandTitle subtitle="Account & wedding" />

        <Card>
          <Text style={styles.label}>Signed in as</Text>
          <Text style={styles.value}>{profile?.name}</Text>
          <Text style={styles.meta}>{profile?.phone}</Text>
        </Card>

        <Card>
          <Text style={styles.label}>Wedding</Text>
          <Text style={styles.value}>{wedding?.name ?? "—"}</Text>
          <Text style={styles.meta}>
            {wedding?.isPremium ? "Premium" : "Free"}
            {wedding?.shareCode ? ` · Share code ${wedding.shareCode}` : ""}
          </Text>
        </Card>

        <Card>
          <Text style={styles.label}>Invite collaborator</Text>
          <Field
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            placeholder="+92…"
            keyboardType="phone-pad"
          />
          <ErrorText message={inviteError} />
          {inviteOk ? (
            <Text style={styles.success}>Invite sent</Text>
          ) : null}
          <PrimaryButton
            label="Send invite"
            loading={inviting}
            onPress={() => void onInvite()}
          />
        </Card>

        <Card>
          <Text style={styles.label}>Web tools</Text>
          <View style={styles.linkStack}>
            <SecondaryButton
              label="Premium themes"
              onPress={() => void openWebPath("/upgrade")}
            />
            <SecondaryButton
              label="Wedding settings"
              onPress={() => void openWebPath("/settings")}
            />
          </View>
        </Card>

        <Card>
          <Text style={styles.label}>Backend</Text>
          <Text style={styles.meta}>
            Firebase {env} · API {apiUrl}
          </Text>
        </Card>

        <View style={{ marginTop: spacing.md }}>
          <PrimaryButton label="Sign out" onPress={() => void signOut()} />
        </View>
        <Text style={styles.footer}>
          Shaadi Saathi mobile · same Firebase backend as the web app
        </Text>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  label: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    color: colors.muted,
    marginBottom: 4,
  },
  value: {
    fontFamily: "DMSans_700Bold",
    fontSize: 18,
    color: colors.ink,
  },
  meta: {
    marginTop: 4,
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: colors.muted,
  },
  success: {
    marginBottom: spacing.sm,
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
    color: colors.success,
  },
  linkStack: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  footer: {
    marginTop: spacing.xl,
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
  },
})
