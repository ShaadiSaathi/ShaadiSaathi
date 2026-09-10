import { useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
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
import { INVITE_THEMES } from "@/src/lib/premium"
import { updateWeddingInviteTheme } from "@/src/lib/premium-api"
import { colors, spacing } from "@/src/lib/theme"
import type { InviteThemeId } from "@/src/lib/types"

export default function SettingsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { profile, signOut } = useAuth()
  const { wedding, weddingId } = useWedding()
  const [phone, setPhone] = useState("")
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteOk, setInviteOk] = useState(false)
  const [themeBusy, setThemeBusy] = useState(false)
  const [themeError, setThemeError] = useState<string | null>(null)

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

  async function onTheme(id: InviteThemeId) {
    if (!weddingId) return
    if (id !== "classic" && !wedding?.isPremium) {
      setThemeError("Premium required for this theme")
      router.push("/(family)/upgrade")
      return
    }
    setThemeBusy(true)
    setThemeError(null)
    try {
      await updateWeddingInviteTheme(weddingId, id)
    } catch (e) {
      setThemeError(e instanceof Error ? e.message : "Could not save theme")
    } finally {
      setThemeBusy(false)
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
          <SecondaryButton
            label="Premium plan"
            onPress={() => router.push("/(family)/upgrade")}
          />
        </Card>

        <Card>
          <Text style={styles.label}>Invite theme</Text>
          <ErrorText message={themeError} />
          {INVITE_THEMES.map((theme) => {
            const selected = (wedding?.inviteTheme ?? "classic") === theme.id
            return (
              <Pressable
                key={theme.id}
                onPress={() => void onTheme(theme.id)}
                disabled={themeBusy}
                style={[styles.themeRow, selected && styles.themeOn]}
              >
                <Text style={styles.themeName}>
                  {theme.name}
                  {theme.premium ? " · Premium" : ""}
                </Text>
                <Text style={styles.meta}>{theme.description}</Text>
              </Pressable>
            )
          })}
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
          <Text style={styles.label}>Backend</Text>
          <Text style={styles.meta}>
            Firebase {env} · API {apiUrl}
          </Text>
        </Card>

        <View style={{ marginTop: spacing.md }}>
          <PrimaryButton label="Sign out" onPress={() => void signOut()} />
        </View>
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
    color: colors.maroon,
  },
  themeRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.sm,
    marginTop: spacing.sm,
    backgroundColor: colors.ivory,
  },
  themeOn: {
    borderColor: colors.maroon,
    backgroundColor: colors.white,
  },
  themeName: {
    fontFamily: "DMSans_700Bold",
    fontSize: 15,
    color: colors.maroonDark,
  },
})
