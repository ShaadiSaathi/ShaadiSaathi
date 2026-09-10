import { useEffect, useMemo, useRef, useState } from "react"
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  BrandTitle,
  Card,
  ErrorText,
  PrimaryButton,
  Screen,
  SecondaryButton,
} from "@/src/components/ui"
import { useWedding } from "@/src/context/WeddingContext"
import { askWeddingAi, getWeddingAiUsage } from "@/src/lib/premium-api"
import { colors, spacing } from "@/src/lib/theme"

type Msg = { id: string; role: "user" | "assistant"; text: string }

export default function WeddingAiScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { wedding } = useWedding()
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usage, setUsage] = useState<string>("")
  const listRef = useRef<FlatList<Msg>>(null)

  useEffect(() => {
    void getWeddingAiUsage()
      .then((r) => {
        setUsage(`${r.usage.remaining} of ${r.usage.limit} left today`)
      })
      .catch(() => setUsage(""))
  }, [messages.length])

  const premium = Boolean(wedding?.isPremium)

  async function send() {
    const text = input.trim()
    if (!text || busy) return
    setInput("")
    setError(null)
    const userMsg: Msg = { id: `u_${Date.now()}`, role: "user", text }
    setMessages((m) => [...m, userMsg])
    setBusy(true)
    try {
      const res = await askWeddingAi(text)
      setMessages((m) => [
        ...m,
        {
          id: `a_${Date.now()}`,
          role: "assistant",
          text: res.reply || "No reply",
        },
      ])
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not reach Wedding AI"
      setError(msg)
      if (msg.toLowerCase().includes("premium") || msg.includes("403")) {
        setError("Wedding AI needs Premium. Upgrade in the app.")
      }
    } finally {
      setBusy(false)
    }
  }

  const header = useMemo(
    () => (
      <View>
        <BrandTitle subtitle="Ask anything about your wedding plan" />
        {usage ? <Text style={styles.usage}>{usage}</Text> : null}
        {!premium ? (
          <Card>
            <Text style={styles.lock}>
              Premium unlocks Wedding AI. You can still try — the API enforces
              access.
            </Text>
            <SecondaryButton
              label="View Premium"
              onPress={() => router.push("/(family)/upgrade")}
            />
          </Card>
        ) : null}
        <ErrorText message={error} />
      </View>
    ),
    [usage, premium, error, router]
  )

  return (
    <Screen style={{ paddingTop: insets.top + spacing.md, paddingBottom: 0 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          ListHeaderComponent={header}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: true })
          }
          contentContainerStyle={{ paddingBottom: spacing.md }}
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubble,
                item.role === "user" ? styles.user : styles.assistant,
              ]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  item.role === "user" && styles.userText,
                ]}
              >
                {item.text}
              </Text>
            </View>
          )}
        />
        <View style={styles.composer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="e.g. Mehndi timeline tips for 200 guests"
            placeholderTextColor={colors.muted}
            style={styles.input}
            editable={!busy}
          />
          <PrimaryButton
            label={busy ? "Thinking…" : "Send"}
            loading={busy}
            disabled={!input.trim()}
            onPress={() => void send()}
          />
          <SecondaryButton
            label="Buy more AI questions"
            onPress={() =>
              router.push({
                pathname: "/(family)/pay",
                params: { kind: "ai-topup" },
              })
            }
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  usage: {
    fontFamily: "DMSans_400Regular",
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  lock: {
    fontFamily: "DMSans_400Regular",
    color: colors.ink,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  bubble: {
    maxWidth: "90%",
    borderRadius: 14,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  user: {
    alignSelf: "flex-end",
    backgroundColor: colors.maroon,
  },
  assistant: {
    alignSelf: "flex-start",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    color: colors.ink,
    lineHeight: 21,
  },
  userText: { color: colors.white },
  composer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontFamily: "DMSans_400Regular",
    fontSize: 16,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
})
